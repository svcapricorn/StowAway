import { Router, Response, Request } from 'express';
import { CustomRequest, verifyToken } from '../middleware/auth';
import prisma from '../lib/prisma';
import { safeParse, safeDate } from '../lib/parsing';

const router = Router();

// Apply auth middleware to all inventory routes
router.use(verifyToken);

// Simple ping to verify auth handles correctly without DB
router.get('/ping', (req, res) => {
  const userId = (req as unknown as CustomRequest).userId;
  res.json({ status: 'ok', userId });
});

// Identify a photographed item via Claude vision, keeping the API key server-side only
router.post('/vision/identify', async (req: Request, res: Response) => {
  const { imageData } = req.body as { imageData?: string };

  const imageMatch = imageData?.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!imageMatch) {
    res.status(400).json({ error: 'imageData must be a base64 image data URL' });
    return;
  }
  const [, mediaType, base64Data] = imageMatch;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'Vision identification is not configured on the server' });
    return;
  }

  const controller = new AbortController();
  // Vision requests take longer than typical API calls; 15s was too tight and
  // caused intermittent silent fallbacks to the weaker on-device OCR.
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        temperature: 0.1,
        system:
          "You are a vessel inventory assistant. Identify the item in the image by READING THE TEXT LABELS (OCR) and analyzing the packaging or object itself. Prioritize text found on the label (Brand, Product Name, Size/Strength) to determine the item 'name'. Items can be anything stored aboard a boat, not just medical supplies. Return strictly valid JSON with no markdown formatting containing: 'name' (string), 'category' (one of: medications, first-aid, tools, emergency, hygiene, diagnostic, ppe, other), and 'confidence' (number 0-1).",
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
              {
                type: 'text',
                text: 'Identify this item. Read all visible text on the packaging, bottle, box, or object to determine exactly what it is. Include size, dosage, or specific type if visible. Choose the best-fitting category even if it is not a medical item.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error(`Vision provider returned ${response.status}: ${errorBody}`);
      res.status(502).json({ error: 'Vision provider returned an error' });
      return;
    }

    const data = await response.json() as { content?: { type: string; text?: string }[] };
    const content = data.content?.find(block => block.type === 'text')?.text;

    if (!content) {
      console.error('Vision provider returned no text content:', JSON.stringify(data));
      res.status(502).json({ error: 'Vision provider returned no content' });
      return;
    }

    // Claude sometimes wraps the JSON in prose/markdown despite instructions —
    // extract the outermost {...} block instead of assuming the whole string is JSON.
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Vision provider response had no JSON object:', content);
      res.status(502).json({ error: 'Vision provider returned an unparseable result' });
      return;
    }

    let parsed: { name?: string; category?: string; confidence?: number };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Vision provider response was not valid JSON:', content);
      res.status(502).json({ error: 'Vision provider returned an unparseable result' });
      return;
    }

    if (!parsed.name || !parsed.category) {
      console.error('Vision provider response missing required fields:', content);
      res.status(502).json({ error: 'Vision provider returned an incomplete result' });
      return;
    }

    res.json({
      name: parsed.name,
      category: parsed.category,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
    });
  } catch (error) {
    console.error('Vision identify failed:', error);
    res.status(502).json({ error: 'Vision identification failed' });
  } finally {
    clearTimeout(timeoutId);
  }
});

// GET all items for the logged-in user
router.get('/', async (req: Request, res: Response) => {
  const customReq = req as unknown as CustomRequest;
  if (!customReq.userId) {
    res.status(401).json({ error: 'User ID missing' });
    return;
  }

  try {
    const items = await prisma.inventoryItem.findMany({
      where: { userId: customReq.userId }
    });
    // Parse photos JSON string to array for frontend
    const parsedItems = items.map(item => ({
      ...item,
      photos: safeParse(item.photos)
    }));
    res.json(parsedItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// POST create new item
router.post('/', async (req: Request, res: Response) => {
  const customReq = req as unknown as CustomRequest;
  if (!customReq.userId) {
    res.status(401).json({ error: 'User ID missing' });
    return;
  }

  try {
    // Strip metadata that shouldn't be manually set or causes type errors (e.g. string dates)
    // We allow 'id' to be passed if the client generated it (e.g. for optimistic UI)
    const { photos, createdAt, updatedAt, userId: _userId, ...rest } = req.body;
    
    const newItem = await prisma.inventoryItem.create({
      data: {
        ...rest,
        userId: customReq.userId,
        photos: JSON.stringify(photos || []),
        minQuantity: rest.minQuantity !== undefined ? Number(rest.minQuantity) : 0, // Ensure minQuantity
        expirationDate: safeDate(req.body.expirationDate)
      }
    });
    
    const responseItem = {
      ...newItem,
      photos: safeParse(newItem.photos)
    };
    
    res.status(201).json(responseItem);
  } catch (error: any) {
    console.error("Create Item Error:", error);
    res.status(500).json({ error: 'Failed to create item', details: error.message });
  }
});

// PUT update item
router.put('/:id', async (req: Request, res: Response) => {
  const customReq = req as unknown as CustomRequest;
  const { id } = req.params;
  
  if (!customReq.userId) {
    res.status(401).json({ error: 'User ID missing' });
    return;
  }

  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }

  try {
    // Ensure user owns the item before updating
    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    
    if (!existing || existing.userId !== customReq.userId) {
       res.status(403).json({ error: 'Not authorized' });
       return;
    }

    const { id: _, userId: __, createdAt: ___, updatedAt: ____, photos, ...updateData } = req.body;

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...updateData,
        photos: photos ? JSON.stringify(photos) : undefined,
        expirationDate: safeDate(req.body.expirationDate)
      }
    });

    res.json({
        ...updated,
        photos: safeParse(updated.photos)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE item
router.delete('/:id', async (req: Request, res: Response) => {
  const customReq = req as unknown as CustomRequest;
  const { id } = req.params;
  
  if (!customReq.userId) {
     res.status(401).json({ error: 'User ID missing' });
     return;
  }

  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }

  try {
    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    
    if (!existing || existing.userId !== customReq.userId) {
       res.status(403).json({ error: 'Not authorized' });
       return;
    }

    await prisma.inventoryItem.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;
