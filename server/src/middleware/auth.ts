import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import prisma from '../lib/prisma';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAudience = process.env.SUPABASE_JWT_AUDIENCE || 'authenticated';
const supabaseIssuer = supabaseUrl ? new URL('/auth/v1', supabaseUrl).toString().replace(/\/$/, '') : null;
const supabaseJwks = supabaseUrl
  ? createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', supabaseUrl))
  : null;

// Simple in-memory cache to avoid hitting the DB on every request for user sync
const verifiedUsers = new Set<string>();

export interface CustomRequest extends Request {
  userId?: string;
}

export const verifyToken = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
  console.log(`[Auth] Verifying token for ${req.path}`);
  // Allow Dev Bypass
  if (req.headers['x-dev-user-id'] && req.headers.authorization === 'Bearer dev-token') {
    console.log('[Auth] Dev bypass detected');
    const userId = req.headers['x-dev-user-id'] as string;
    req.userId = userId;

    // Only sync if not recently verified
    if (!verifiedUsers.has(userId)) {
      console.log('[Auth] Syncing dev user to DB...');
      try {
        await prisma.user.upsert({
          where: { id: userId },
          update: {},
          create: {
            id: userId,
            email: `dev-${userId}@local.test`,
            firstName: 'Dev',
            lastName: 'User',
            settings: {
              create: {
                 lowStockThreshold: 25,
                 expirationWarningDays: JSON.stringify([30, 60, 90]),
                 theme: 'system',
                 userRole: 'captain',
                 subscriptionTier: 'free'
              }
            }
          }
        });
        verifiedUsers.add(userId);
        console.log('[Auth] Dev user synced.');
      } catch (e) {
        console.error("Failed to seed dev user", e);
        // If we can't seed the user, subsequent DB calls will fail 500
        // It's better to fail here or at least know why.
        // Proceeding might be dangerous if the user doesn't exist.
        // Let's verify if user exists even if upsert failed (maybe unique constraint on email but user exists?)
        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        if (!userExists) {
           res.status(500).json({ error: 'Dev user sync failed', details: String(e) });
           return;
        }
      }
    } else {
      console.log('[Auth] Dev user already verified.');
    }

    next();
    return;
  }

  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/Bearer (.+)/);

  if (!match) {
    res.status(401).send('Unauthorized: No token provided');
    return;
  }

  const accessToken = match[1];

  try {
    if (!supabaseJwks || !supabaseIssuer) {
      res.status(500).send('Server auth is not configured');
      return;
    }

    const { payload } = await jwtVerify(accessToken, supabaseJwks, {
      issuer: supabaseIssuer,
      audience: supabaseAudience,
    });

    if (typeof payload.sub !== 'string') {
      res.status(401).send('Unauthorized: Invalid token subject');
      return;
    }

    req.userId = payload.sub;
    
    // Only sync if not recently verified to drastically reduce DB load
    if (!verifiedUsers.has(req.userId)) {
      try {
        const email = typeof payload.email === 'string' ? payload.email : `${payload.sub}@placeholder.supabase`;
        
        // Upsert User
        await prisma.user.upsert({
          where: { id: req.userId },
          update: {}, // No-op if exists
          create: {
            id: req.userId,
            email: email,
            firstName: 'SailMed', // Helper defaults until profile edit implemented
            lastName: 'User',
            // Create default settings immediately
            settings: {
              create: {
                 lowStockThreshold: 25,
                 expirationWarningDays: JSON.stringify([30, 60, 90]),
                 theme: 'system',
                 userRole: 'captain',
                 subscriptionTier: 'free'
              }
            }
          }
        });
        verifiedUsers.add(req.userId);
      } catch (e) {
        console.error('Failed to sync Supabase user', e);
      }
    }

    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).send('Unauthorized: Invalid token');
  }
};
