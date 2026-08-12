import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response, NextFunction } from 'express';

vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      upsert: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({ id: 'dev-user-123' }),
    },
  },
}));

import { verifyToken, type CustomRequest } from './auth';
import prisma from '../lib/prisma';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('verifyToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows the dev bypass and sets req.userId, syncing the dev user', async () => {
    const req = {
      headers: {
        'x-dev-user-id': 'dev-user-123',
        authorization: 'Bearer dev-token',
      },
      path: '/',
    } as unknown as CustomRequest;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await verifyToken(req, res, next);

    expect(req.userId).toBe('dev-user-123');
    expect(next).toHaveBeenCalledTimes(1);
    expect(prisma.user.upsert).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects a request with no Authorization header', async () => {
    const req = { headers: {}, path: '/' } as unknown as CustomRequest;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a malformed Authorization header without a Bearer token', async () => {
    const req = { headers: { authorization: 'Basic abc123' }, path: '/' } as unknown as CustomRequest;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 500 when Supabase auth is not configured on the server', async () => {
    const req = {
      headers: { authorization: 'Bearer some-real-looking-token' },
      path: '/',
    } as unknown as CustomRequest;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await verifyToken(req, res, next);

    // SUPABASE_URL is unset in the test environment, so the JWKS client is never configured.
    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });
});
