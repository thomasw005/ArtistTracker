import type { Request, Response, NextFunction } from 'express';
import { sql } from '../db.js';
import { verifyToken, type TokenPayload } from './jwt.js';
import type { User } from '../types.js';

// Middleware that blocks a request unless it carries a valid JWT cookie AND
// the user that token names still exists in the database. On success it
// attaches the authenticated user's id to `req` and calls next().
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.token;

    if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    let payload: TokenPayload;
    try {
        payload = verifyToken(token);
    } catch {
        // verifyToken throws if the token is missing, tampered with, or expired
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }

    // The signature is valid, but the session can still be dead two ways: the
    // user was deleted, or this exact token was revoked by a logout. Both are
    // checked in one round trip.
    const rows = (await sql`
        SELECT u.id FROM users u
        WHERE u.id = ${payload.userId}
          AND NOT EXISTS (
              SELECT 1 FROM revoked_tokens rt WHERE rt.jti = ${payload.jti}
          )
    `) as Pick<User, 'id'>[];

    if (rows.length === 0) {
        res.status(401).json({ error: 'Session is no longer valid' });
        return;
    }

    req.userId = payload.userId;
    next();
}