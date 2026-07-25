import { Router } from 'express';
import { sql } from '../db.js';
import { requireAuth } from '../auth/requireAuth.js';
import { catalogCreateLimiter } from '../middleware/rateLimit.js';
import type { Venue } from '../types.js';

const router = Router();

// GET /api/venues - list venues, optionally filtered by ?search=
router.get('/', async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const pattern = `%${search}%`;
    const venues = (await sql`
        SELECT * FROM venues WHERE name ILIKE ${pattern} ORDER BY name
    `) as Venue[];
    res.json(venues);
});

// GET /api/venues/:id - get one venue
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const rows = (await sql`SELECT * FROM venues WHERE id = ${id}`) as Venue[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Venue not found' });
        return;
    }

    res.json(rows[0]);
});

// POST /api/venues - create a venue (added to the shared catalog)
router.post('/', requireAuth, catalogCreateLimiter, async (req, res) => {
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

// PUT /api/venues/:id - update a venue
router.put('/:id', requireAuth, async (req, res) => {
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

// DELETE /api/venues/:id - delete a venue
router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const rows = (await sql`DELETE FROM venues WHERE id = ${id} RETURNING *`) as Venue[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Venue not found' });
        return;
    }

    res.status(204).send(); // 204 - success
});

export default router;