import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      upsert: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({ id: 'dev-user-123' }),
    },
    inventoryItem: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import prisma from '../lib/prisma';
import inventoryRouter from './inventory';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/inventory', inventoryRouter);
  return app;
}

const devHeaders = {
  Authorization: 'Bearer dev-token',
  'x-dev-user-id': 'dev-user-123',
};

describe('inventory routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.upsert as any).mockResolvedValue({});
  });

  it('rejects requests with no auth at all', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/inventory');
    expect(res.status).toBe(401);
  });

  it('GET / returns the current user\'s items with photos parsed from JSON', async () => {
    (prisma.inventoryItem.findMany as any).mockResolvedValue([
      { id: '1', name: 'Bandages', userId: 'dev-user-123', photos: '["a.png"]' },
    ]);

    const app = buildApp();
    const res = await request(app).get('/api/inventory').set(devHeaders);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: '1', name: 'Bandages', userId: 'dev-user-123', photos: ['a.png'] },
    ]);
    expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith({ where: { userId: 'dev-user-123' } });
  });

  it('POST / creates an item scoped to the authenticated user', async () => {
    (prisma.inventoryItem.create as any).mockResolvedValue({
      id: '2',
      name: 'Aspirin',
      userId: 'dev-user-123',
      photos: '[]',
    });

    const app = buildApp();
    const res = await request(app)
      .post('/api/inventory')
      .set(devHeaders)
      .send({ name: 'Aspirin', category: 'medications', quantity: 1, minQuantity: 1, location: 'galley' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Aspirin');
    expect(res.body.photos).toEqual([]);
    expect(prisma.inventoryItem.create).toHaveBeenCalled();
  });

  it('PUT /:id rejects updates to an item owned by a different user', async () => {
    (prisma.inventoryItem.findUnique as any).mockResolvedValue({ id: '3', userId: 'someone-else' });

    const app = buildApp();
    const res = await request(app)
      .put('/api/inventory/3')
      .set(devHeaders)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
    expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
  });

  it('PUT /:id updates an item owned by the authenticated user', async () => {
    (prisma.inventoryItem.findUnique as any).mockResolvedValue({ id: '3', userId: 'dev-user-123' });
    (prisma.inventoryItem.update as any).mockResolvedValue({
      id: '3',
      name: 'Updated Name',
      userId: 'dev-user-123',
      photos: '[]',
    });

    const app = buildApp();
    const res = await request(app)
      .put('/api/inventory/3')
      .set(devHeaders)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
  });

  it('DELETE /:id rejects deleting an item owned by a different user', async () => {
    (prisma.inventoryItem.findUnique as any).mockResolvedValue({ id: '4', userId: 'someone-else' });

    const app = buildApp();
    const res = await request(app).delete('/api/inventory/4').set(devHeaders);

    expect(res.status).toBe(403);
    expect(prisma.inventoryItem.delete).not.toHaveBeenCalled();
  });

  it('DELETE /:id deletes an item owned by the authenticated user', async () => {
    (prisma.inventoryItem.findUnique as any).mockResolvedValue({ id: '4', userId: 'dev-user-123' });
    (prisma.inventoryItem.delete as any).mockResolvedValue({});

    const app = buildApp();
    const res = await request(app).delete('/api/inventory/4').set(devHeaders);

    expect(res.status).toBe(204);
    expect(prisma.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: '4' } });
  });

  it('GET /ping confirms auth and returns the userId', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/inventory/ping').set(devHeaders);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', userId: 'dev-user-123' });
  });

  it('POST /vision/identify rejects a payload that is not an image data URL', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/inventory/vision/identify')
      .set(devHeaders)
      .send({ imageData: 'not-an-image' });

    expect(res.status).toBe(400);
  });

  it('POST /vision/identify returns 503 when ANTHROPIC_API_KEY is not configured', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const app = buildApp();
    const res = await request(app)
      .post('/api/inventory/vision/identify')
      .set(devHeaders)
      .send({ imageData: 'data:image/jpeg;base64,abc123' });

    expect(res.status).toBe(503);

    if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it('GET / returns 500 when the database call fails', async () => {
    (prisma.inventoryItem.findMany as any).mockRejectedValue(new Error('db down'));

    const app = buildApp();
    const res = await request(app).get('/api/inventory').set(devHeaders);

    expect(res.status).toBe(500);
  });

  it('POST / returns 500 with error details when creation fails', async () => {
    (prisma.inventoryItem.create as any).mockRejectedValue(new Error('constraint violation'));

    const app = buildApp();
    const res = await request(app)
      .post('/api/inventory')
      .set(devHeaders)
      .send({ name: 'Aspirin' });

    expect(res.status).toBe(500);
    expect(res.body.details).toBe('constraint violation');
  });

  it('PUT /:id returns 500 when the update call fails', async () => {
    (prisma.inventoryItem.findUnique as any).mockResolvedValue({ id: '3', userId: 'dev-user-123' });
    (prisma.inventoryItem.update as any).mockRejectedValue(new Error('update failed'));

    const app = buildApp();
    const res = await request(app)
      .put('/api/inventory/3')
      .set(devHeaders)
      .send({ name: 'X' });

    expect(res.status).toBe(500);
  });

  it('DELETE /:id returns 500 when the delete call fails', async () => {
    (prisma.inventoryItem.findUnique as any).mockResolvedValue({ id: '4', userId: 'dev-user-123' });
    (prisma.inventoryItem.delete as any).mockRejectedValue(new Error('delete failed'));

    const app = buildApp();
    const res = await request(app).delete('/api/inventory/4').set(devHeaders);

    expect(res.status).toBe(500);
  });

  describe('POST /vision/identify with ANTHROPIC_API_KEY configured', () => {
    const originalFetch = global.fetch;
    const originalKey = process.env.ANTHROPIC_API_KEY;

    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
    });

    afterEach(() => {
      global.fetch = originalFetch;
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    });

    it('returns the identified item on a successful Claude response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '{"name":"Aspirin","category":"medications","confidence":0.9}' }],
        }),
      }) as any;

      const app = buildApp();
      const res = await request(app)
        .post('/api/inventory/vision/identify')
        .set(devHeaders)
        .send({ imageData: 'data:image/jpeg;base64,abc123' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ name: 'Aspirin', category: 'medications', confidence: 0.9 });
    });

    it('returns 502 when Claude responds with a non-OK status', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid api key' }) as any;

      const app = buildApp();
      const res = await request(app)
        .post('/api/inventory/vision/identify')
        .set(devHeaders)
        .send({ imageData: 'data:image/jpeg;base64,abc123' });

      expect(res.status).toBe(502);
    });

    it('returns 502 when the model response is not valid JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: 'not json at all' }] }),
      }) as any;

      const app = buildApp();
      const res = await request(app)
        .post('/api/inventory/vision/identify')
        .set(devHeaders)
        .send({ imageData: 'data:image/jpeg;base64,abc123' });

      expect(res.status).toBe(502);
    });

    it('returns 502 when the model response is missing required fields', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: '{"confidence":0.5}' }] }),
      }) as any;

      const app = buildApp();
      const res = await request(app)
        .post('/api/inventory/vision/identify')
        .set(devHeaders)
        .send({ imageData: 'data:image/jpeg;base64,abc123' });

      expect(res.status).toBe(502);
    });
  });
});
