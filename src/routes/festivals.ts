import { Router } from 'express';
import { sql } from '../db.js';
import { requireAuth } from '../auth/requireAuth.js';
import { optionalAuth } from '../auth/optionalAuth.js';
import { catalogCreateLimiter } from '../middleware/rateLimit.js';
import type { Festival, FestivalWithRatings } from '../types.js';

const router = Router();

// A festival's rating is derived from the ratings of its events (user_events),
// so both the community average and the user's own value are averages.

// GET /api/festivals - list festivals (with derived ratings), optional ?search=
router.get('/', optionalAuth, async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const pattern = `%${search}%`;
    const festivals = (await sql`
        SELECT f.*,
               ROUND(AVG(ue.rating), 2)                                          AS avg_rating,
               COUNT(ue.rating)::int                                             AS rating_count,
               ROUND(AVG(ue.rating) FILTER (WHERE ue.user_id = ${req.userId ?? null}), 2) AS my_rating
        FROM festivals f
        LEFT JOIN events e       ON e.festival_id = f.id
        LEFT JOIN user_events ue ON ue.event_id = e.id
        WHERE f.name ILIKE ${pattern}
        GROUP BY f.id
        ORDER BY f.year DESC, f.name
    `) as FestivalWithRatings[];
    res.json(festivals);
});

// GET /api/festivals/:id - get one festival (with derived ratings)
router.get('/:id', optionalAuth, async (req, res) => {
    const { id } = req.params;
    const rows = (await sql`
        SELECT f.*,
               ROUND(AVG(ue.rating), 2)                                          AS avg_rating,
               COUNT(ue.rating)::int                                             AS rating_count,
               ROUND(AVG(ue.rating) FILTER (WHERE ue.user_id = ${req.userId ?? null}), 2) AS my_rating
        FROM festivals f
        LEFT JOIN events e       ON e.festival_id = f.id
        LEFT JOIN user_events ue ON ue.event_id = e.id
        WHERE f.id = ${id}
        GROUP BY f.id
    `) as FestivalWithRatings[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Festival not found' });
        return;
    }

    res.json(rows[0]);
});

// POST /api/festivals - create a festival (added to the shared catalog)
router.post('/', requireAuth, catalogCreateLimiter, async (req, res) => {
    const { name, year } = (req.body ?? {}) as Partial<Festival>;

    if (!name || year == null) {
        res.status(400).json({ error: 'name and year are required' });
        return;
    }

    const rows = (await sql`
        INSERT INTO festivals (name, year, created_by)
        VALUES (${name}, ${year}, ${req.userId})
        RETURNING *
    `) as Festival[];

    res.status(201).json(rows[0]);
});

// PUT /api/festivals/:id - update a festival (any signed-in user)
router.put('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { name, year } = (req.body ?? {}) as Partial<Festival>;

    const rows = (await sql`
        UPDATE festivals
        SET name = ${name}, year = ${year}
        WHERE id = ${id}
        RETURNING *
    `) as Festival[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Festival not found' });
        return;
    }

    res.json(rows[0]);
});

// DELETE /api/festivals/:id - delete a festival (any signed-in user)
router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    const rows = (await sql`DELETE FROM festivals WHERE id = ${id} RETURNING *`) as Festival[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Festival not found' });
        return;
    }

    res.status(204).send(); // 204 - success
});

export default router;