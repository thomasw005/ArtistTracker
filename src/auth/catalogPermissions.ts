import type { Request } from 'express';

// The minimal slice of a catalog row needed to decide edit rights.
export interface CatalogGuardRow {
    created_by: number | null;
    verified: boolean;
}

/**
 * Decide whether the current user may edit or delete a catalog entry.
 * Returns null when allowed, or an { status, message } to send back:
 *   - 404 if the entry doesn't exist (or is already soft-deleted)
 *   - 403 if it's verified/canonical and the user isn't an admin
 *   - 403 if the user is neither the creator nor an admin
 * Assumes requireAuth already ran, so req.userId and req.isAdmin are set.
 */
export function catalogEditError(
    entry: CatalogGuardRow | undefined,
    req: Request,
): { status: number; message: string } | null {
    if (!entry) {
        return { status: 404, message: 'Not found' };
    }
    if (entry.verified && !req.isAdmin) {
        return { status: 403, message: 'Only an admin can modify a verified entry' };
    }
    if (entry.created_by !== req.userId && !req.isAdmin) {
        return { status: 403, message: 'You can only modify entries you created' };
    }
    return null;
}
