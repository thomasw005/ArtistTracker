import { Router } from 'express';
import { sql } from '../db.js';
import { requireAuth } from '../auth/requireAuth.js';
import { optionalAuth } from '../auth/optionalAuth.js';
import { requireAdmin } from '../auth/requireAdmin.js';
import type { Venue, VenueWithRatings } from '../types.js';

const router = Router();

// GET /api/venues - list venues (with rating aggregates), optional ?search=
router.get('/', optionalAuth, async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const pattern = `%${search}%`;
    const venues = (await sql`
        SELECT v.*,
               ROUND(AVG(uv.rating), 2)                                        AS avg_rating,
               COUNT(uv.rating)::int                                           AS rating_count,
               MAX(uv.rating) FILTER (WHERE uv.user_id = ${req.userId ?? null}) AS my_rating
        FROM venues v
        LEFT JOIN user_venues uv ON uv.venue_id = v.id
        WHERE v.name ILIKE ${pattern}
        GROUP BY v.id
        ORDER BY v.name
    `) as VenueWithRatings[];
    res.json(venues);
});

// GET /api/venues/:id - get one venue (with rating aggregates)
router.get('/:id', optionalAuth, async (req, res) => {
    const { id } = req.params;
    const rows = (await sql`
        SELECT v.*,
               ROUND(AVG(uv.rating), 2)                                        AS avg_rating,
               COUNT(uv.rating)::int                                           AS rating_count,
               MAX(uv.rating) FILTER (WHERE uv.user_id = ${req.userId ?? null}) AS my_rating
        FROM venues v
        LEFT JOIN user_venues uv ON uv.venue_id = v.id
        WHERE v.id = ${id}
        GROUP BY v.id
    `) as VenueWithRatings[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Venue not found' });
        return;
    }

    res.json(rows[0]);
});

// POST /api/venues - create a venue (admin only, until per-user
// contribution permissions exist)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    const { name, city, country } = (req.body ?? {}) as Partial<Venue>;

    if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
    }

    const rows = (await sql`
        INSERT INTO venues (name, city, country, created_by)
        VALUES (${name}, ${city ?? null}, ${country ?? null}, ${req.userId})
        RETURNING *
    `) as Venue[];

    res.status(201).json(rows[0]);
});

// PUT /api/venues/:id - update a venue (admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, city, country } = (req.body ?? {}) as Partial<Venue>;

    const rows = (await sql`
        UPDATE venues
        SET name = ${name}, city = ${city ?? null}, country = ${country ?? null}
        WHERE id = ${id}
        RETURNING *
    `) as Venue[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Venue not found' });
        return;
    }

    res.json(rows[0]);
});

// DELETE /api/venues/:id - delete a venue (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;

    const rows = (await sql`DELETE FROM venues WHERE id = ${id} RETURNING *`) as Venue[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Venue not found' });
        return;
    }

    res.status(204).send(); // 204 - success
});

export default router;