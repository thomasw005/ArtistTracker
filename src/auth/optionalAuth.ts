import type { Request, Response, NextFunction } from 'express';
import { sql } from '../db.js';
import { verifyToken } from './jwt.js';
import type { User } from '../types.js';

// Like requireAuth, but never rejects. If a valid token cookie is present it
// populates req.userId / req.isAdmin; otherwise it just continues as anonymous.
// Used on public GETs that personalize when logged in (e.g. "my_rating"), so
// the same endpoint serves both logged-in and logged-out visitors.
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.token;
    if (!token) {
        next();
        return;
    }

    try {
        const { userId } = verifyToken(token);
        const rows = (await sql`
            SELECT id, is_admin FROM users WHERE id = ${userId}
        `) as Pick<User, 'id' | 'is_admin'>[];
        if (rows.length > 0) {
            req.userId = userId;
            req.isAdmin = rows[0].is_admin;
        }
    } catch {
        // Invalid/expired token on a public route → just treat as anonymous.
    }
    next();
}
