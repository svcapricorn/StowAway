import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction, Response } from 'express';

const { jwtVerifyMock } = vi.hoisted(() => ({ jwtVerifyMock: vi.fn() }));

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => ({})),
  jwtVerify: jwtVerifyMock,
}));

vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      upsert: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({ id: 'sub-123' }),
    },
  },
}));

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('verifyToken with Supabase configured', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    jwtVerifyMock.mockReset();
    process.env.SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';
  });

  it('accepts a valid token, sets req.userId, and syncs the user', async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { sub: 'sub-123', email: 'sailor@example.com' } });

    const { verifyToken } = await import('./auth');
    const prisma = (await import('../lib/prisma')).default;

    const req: any = { headers: { authorization: 'Bearer real-token' }, path: '/' };
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await verifyToken(req, res, next);

    expect(req.userId).toBe('sub-123');
    expect(next).toHaveBeenCalledTimes(1);
    expect(prisma.user.upsert).toHaveBeenCalled();
  });

  it('rejects a token whose payload has no string subject', async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { sub: 123 } });

    const { verifyToken } = await import('./auth');

    const req: any = { headers: { authorization: 'Bearer weird-token' }, path: '/' };
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when token verification fails', async () => {
    jwtVerifyMock.mockRejectedValue(new Error('signature verification failed'));

    const { verifyToken } = await import('./auth');

    const req: any = { headers: { authorization: 'Bearer bad-token' }, path: '/' };
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not re-sync a user already verified earlier in the process', async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { sub: 'sub-123', email: 'sailor@example.com' } });

    const { verifyToken } = await import('./auth');
    const prisma = (await import('../lib/prisma')).default;

    const makeReq = () => ({ headers: { authorization: 'Bearer real-token' }, path: '/' } as any);

    await verifyToken(makeReq(), makeRes(), vi.fn() as NextFunction);
    await verifyToken(makeReq(), makeRes(), vi.fn() as NextFunction);

    expect(prisma.user.upsert).toHaveBeenCalledTimes(1);
  });
});
