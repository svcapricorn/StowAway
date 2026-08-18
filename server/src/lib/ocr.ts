// Server-side OCR for packaging labels.
//
// Two providers, tried in order of what is configured:
//   1. Google Cloud Vision DOCUMENT_TEXT_DETECTION (GOOGLE_VISION_API_KEY)
//   2. AWS Textract DetectDocumentText (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)
//
// Both read printed packaging far more reliably than on-device Tesseract, and
// keeping OCR here removes the ~5MB wasm bundle from the browser build (which
// is also what pushed the Lightsail Vite build over its heap limit).

import { createHash, createHmac } from 'crypto';

export type OcrProvider = 'google-vision' | 'aws-textract';

export interface OcrResult {
  text: string;
  provider: OcrProvider;
}

export function isOcrConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_VISION_API_KEY ||
      (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
  );
}

const OCR_TIMEOUT_MS = 20000;

async function postJson(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------- Google Cloud Vision ----------

async function googleVisionOcr(base64Data: string): Promise<string> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY as string;

  const response = await postJson(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Data },
            // DOCUMENT_TEXT_DETECTION handles dense small print (dosages,
            // counts, ingredient lists) better than TEXT_DETECTION.
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            imageContext: { languageHints: ['en'] },
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Google Vision returned ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    responses?: { fullTextAnnotation?: { text?: string }; error?: { message?: string } }[];
  };

  const first = data.responses?.[0];
  if (first?.error?.message) {
    throw new Error(`Google Vision error: ${first.error.message}`);
  }

  return first?.fullTextAnnotation?.text ?? '';
}

// ---------- AWS Textract (SigV4 signed, no SDK dependency) ----------

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

async function textractOcr(base64Data: string): Promise<string> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID as string;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY as string;
  const sessionToken = process.env.AWS_SESSION_TOKEN;
  const region = process.env.AWS_REGION || 'us-east-1';

  const service = 'textract';
  const host = `${service}.${region}.amazonaws.com`;
  const target = 'Textract.DetectDocumentText';
  const payload = JSON.stringify({ Document: { Bytes: base64Data } });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = sha256Hex(payload);
  const canonicalHeaders =
    `content-type:application/x-amz-json-1.1\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    (sessionToken ? `x-amz-security-token:${sessionToken}\n` : '') +
    `x-amz-target:${target}\n`;
  const signedHeaders = `content-type;host;x-amz-date;${sessionToken ? 'x-amz-security-token;' : ''}x-amz-target`;

  const canonicalRequest = ['POST', '/', '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), service),
    'aws4_request',
  );
  const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-amz-json-1.1',
    'X-Amz-Date': amzDate,
    'X-Amz-Target': target,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
  if (sessionToken) headers['X-Amz-Security-Token'] = sessionToken;

  const response = await postJson(`https://${host}/`, { method: 'POST', headers, body: payload });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`AWS Textract returned ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    Blocks?: { BlockType?: string; Text?: string }[];
  };

  return (data.Blocks || [])
    .filter(block => block.BlockType === 'LINE' && block.Text)
    .map(block => block.Text as string)
    .join('\n');
}

/**
 * Run OCR on a base64 image (no data-URL prefix) using whichever provider is
 * configured. Google Vision wins when both are present; a provider failure
 * falls through to the other so a single outage doesn't kill scanning.
 */
export async function runOcr(base64Data: string): Promise<OcrResult> {
  const attempts: { provider: OcrProvider; run: () => Promise<string> }[] = [];

  if (process.env.GOOGLE_VISION_API_KEY) {
    attempts.push({ provider: 'google-vision', run: () => googleVisionOcr(base64Data) });
  }
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    attempts.push({ provider: 'aws-textract', run: () => textractOcr(base64Data) });
  }

  if (attempts.length === 0) {
    throw new Error('No OCR provider configured');
  }

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const text = await attempt.run();
      return { text, provider: attempt.provider };
    } catch (err) {
      console.error(`OCR provider ${attempt.provider} failed:`, err);
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OCR failed');
}
