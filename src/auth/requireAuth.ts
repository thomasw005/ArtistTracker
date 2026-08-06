import type { Request, Response, NextFunction } from 'express';
import { sql } from '../db.js';
import { verifyToken } from './jwt.js';
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

    let userId: number;
    try {
        userId = verifyToken(token).userId;
    } catch {
        // verifyToken throws if the token is missing, tampered with, or expired
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }

    // The token is cryptographically valid, but the user it names may have been
    // deleted since it was issued. Confirm the row still exists.
    const rows = (await sql`
        SELECT id FROM users WHERE id = ${userId}
    `) as Pick<User, 'id'>[];

    if (rows.length === 0) {
        res.status(401).json({ error: 'Invalid token, User no longer exists' });
        return;
    }

    req.userId = userId;
    next();
}