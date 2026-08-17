import type { Request, Response, NextFunction } from 'express';

// Middleware that blocks a request unless the caller is an admin. Must be
// mounted AFTER requireAuth, which is what puts `isAdmin` on the request.
//
// No database work here: requireAuth already read the flag as part of the
// lookup it has to do anyway. If this ever runs without requireAuth in front
// of it, `isAdmin` is undefined and the request is refused — a missing
// middleware locks the route rather than opening it.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.isAdmin) {
        // 403, not 401: requireAuth has already established who this is, and
        // re-authenticating won't help. The credentials are fine, the account
        // just isn't allowed here.
        res.status(403).json({ error: 'Admin access required' });
        return;
    }

    next();
}
