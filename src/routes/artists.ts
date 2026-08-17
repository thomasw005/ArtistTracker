import { Router } from 'express';
import { sql } from '../db.js';
import { requireAuth } from '../auth/requireAuth.js';
import { optionalAuth } from '../auth/optionalAuth.js';
import { requireAdmin } from '../auth/requireAdmin.js';
import type { Artist, ArtistWithRatings } from '../types.js';

const router = Router();

// GET /api/artists - list artists (with rating aggregates), optional ?search=
router.get('/', optionalAuth, async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const pattern = `%${search}%`;
    const artists = (await sql`
        SELECT a.*,
               ROUND(AVG(ua.rating), 2)                                        AS avg_rating,
               COUNT(ua.rating)::int                                           AS rating_count,
               MAX(ua.rating) FILTER (WHERE ua.user_id = ${req.userId ?? null}) AS my_rating
        FROM artists a
        LEFT JOIN user_artists ua ON ua.artist_id = a.id
        WHERE a.name ILIKE ${pattern}
        GROUP BY a.id
        ORDER BY a.name
    `) as ArtistWithRatings[];
    res.json(artists);
});

// GET /api/artists/:id - get one artist (with rating aggregates)
router.get('/:id', optionalAuth, async (req, res) => {
    const { id } = req.params;
    const rows = (await sql`
        SELECT a.*,
               ROUND(AVG(ua.rating), 2)                                        AS avg_rating,
               COUNT(ua.rating)::int                                           AS rating_count,
               MAX(ua.rating) FILTER (WHERE ua.user_id = ${req.userId ?? null}) AS my_rating
        FROM artists a
        LEFT JOIN user_artists ua ON ua.artist_id = a.id
        WHERE a.id = ${id}
        GROUP BY a.id
    `) as ArtistWithRatings[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Artist not found' });
        return;
    }

    res.json(rows[0]);
});

// POST /api/artists - create an artist (admin only, until per-user
// contribution permissions exist)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    const { name, page_link } = (req.body ?? {}) as Partial<Artist>;

    // The cast above is a claim about the body, not a check on it, so `name`
    // can be any JSON type at runtime. Anything that isn't a string, or is
    // only whitespace, collapses to '' and fails the guard below.
    const artistName = typeof name === 'string' ? name.trim() : '';

    if (!artistName) {
        res.status(400).json({ error: 'name must be a non-empty string' });
        return;
    }

    // page_link is optional and nullable, so absent and null both mean "no
    // link". Anything else has to be a string: an object or a number would
    // otherwise reach a TEXT column and fail inside the driver rather than
    // here, with a much worse message.
    if (page_link != null && typeof page_link !== 'string') {
        res.status(400).json({ error: 'page_link must be a string or null' });
        return;
    }

    // A blank string isn't a link. Store it as NULL so "no link" has a single
    // representation in the column instead of two.
    const artistLink = page_link?.trim() || null;

    const rows = (await sql`
        INSERT INTO artists (name, page_link, created_by)
        VALUES (${artistName}, ${artistLink}, ${req.userId})
        RETURNING *
    `) as Artist[];

    res.status(201).json(rows[0]);
});

// PUT /api/artists/:id - update an artist (admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, page_link } = (req.body ?? {}) as Partial<Artist>;

    const artistName = typeof name === 'string' ? name.trim() : '';

    if (!artistName) {
        res.status(400).json({ error: 'name must be a non-empty string' });
        return;
    }

    if (page_link != null && typeof page_link !== 'string') {
        res.status(400).json({ error: 'page_link must be a string or null' });
        return;
    }

    // Omitting page_link clears it — this is a PUT, so the body is the whole
    // artist, not a patch.
    const artistLink = page_link?.trim() || null;

    const rows = (await sql`
        UPDATE artists
        SET name = ${artistName}, page_link = ${artistLink}
        WHERE id = ${id}
        RETURNING *
    `) as Artist[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Artist not found' });
        return;
    }

    res.json(rows[0]);
});

// DELETE /api/artists/:id - delete an artist (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;

    const rows = (await sql`DELETE FROM artists WHERE id = ${id} RETURNING *`) as Artist[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Artist not found' });
        return;
    }

    res.status(204).send(); // 204 - success
});

export default router;