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

// Identify a photographed item via OpenAI vision, keeping the API key server-side only
router.post('/vision/identify', async (req: Request, res: Response) => {
  const { imageData } = req.body as { imageData?: string };

  if (!imageData || typeof imageData !== 'string' || !imageData.startsWith('data:image')) {
    res.status(400).json({ error: 'imageData must be a base64 image data URL' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'Vision identification is not configured on the server' });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              "You are a medical inventory assistant. Identify the medical supply item in the image by READING THE TEXT LABELS (OCR) and analyzing the packaging. Prioritize text found on the label (Brand, Chemical Name, Dosage) to determine the item 'name'. Return strictly valid JSON with no markdown formatting containing: 'name' (string), 'category' (one of: medications, first-aid, tools, diagnostic, ppe, other), and 'confidence' (number 0-1).",
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Identify this medical item. Read all visible text on the packaging, bottle, or box to determine exactly what it is. Include dosage or specific type if visible.',
              },
              { type: 'image_url', image_url: { url: imageData } },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      res.status(502).json({ error: 'Vision provider returned an error' });
      return;
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      res.status(502).json({ error: 'Vision provider returned no content' });
      return;
    }

    const parsed = JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());

    if (!parsed.name || !parsed.category) {
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
