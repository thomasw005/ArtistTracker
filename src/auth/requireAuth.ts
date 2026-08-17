import type { Request, Response, NextFunction } from 'express';
import { sql } from '../db.js';
import { verifyToken, type TokenPayload } from './jwt.js';
import type { User } from '../types.js';

// Middleware that blocks a request unless it carries a valid JWT cookie AND
// the user that token names still exists in the database. On success it
// attaches the authenticated user's id and admin flag to `req` and calls next().
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
    //
    // is_admin is read here rather than carried in the JWT: a token lives 7
    // days, so a token-borne flag would keep granting admin long after the
    // column was flipped off. This query already runs on every authed request,
    // so the column is free and requireAdmin needs no round trip of its own.
    const rows = (await sql`
        SELECT u.id, u.is_admin FROM users u
        WHERE u.id = ${payload.userId}
          AND NOT EXISTS (
              SELECT 1 FROM revoked_tokens rt WHERE rt.jti = ${payload.jti}
          )
    `) as Pick<User, 'id' | 'is_admin'>[];

    if (rows.length === 0) {
        res.status(401).json({ error: 'Session is no longer valid' });
        return;
    }

    req.userId = payload.userId;
    req.isAdmin = rows[0].is_admin;
    next();
}