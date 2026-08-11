import type { Request, Response, NextFunction } from 'express';
import { sql } from '../db.js';
import { verifyToken } from './jwt.js';
import type { User } from '../types.js';

// Like requireAuth, but never rejects. If a valid token cookie is present it
// populates req.userId; otherwise it just continues as anonymous.
// Used on public GETs that personalize when logged in (e.g. "my_rating"), so
// the same endpoint serves both logged-in and logged-out visitors.
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.token;
    if (!token) {
        next();
        return;
    }

    try {
        const { userId, jti } = verifyToken(token);
        // Same two checks as requireAuth: the user still exists, and this token
        // wasn't revoked by a logout. Failing either just means "anonymous".
        const rows = (await sql`
            SELECT u.id FROM users u
            WHERE u.id = ${userId}
              AND NOT EXISTS (
                  SELECT 1 FROM revoked_tokens rt WHERE rt.jti = ${jti}
              )
        `) as Pick<User, 'id'>[];
        if (rows.length > 0) {
            req.userId = userId;
        }
    } catch {
        // Invalid/expired token on a public route → just treat as anonymous.
    }
    next();
}
