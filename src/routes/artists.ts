import { Router } from 'express';
import { sql } from '../db.js';
import { requireAuth } from '../auth/requireAuth.js';
import { catalogCreateLimiter } from '../middleware/rateLimit.js';
import type { Artist } from '../types.js';

const router = Router();

// GET /api/artists - list artists, optionally filtered by ?search=
router.get('/', async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const pattern = `%${search}%`;
    const artists = (await sql`
        SELECT * FROM artists WHERE name ILIKE ${pattern} ORDER BY name
    `) as Artist[];
    res.json(artists);
});

// GET /api/artists/:id - get one artist
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const rows = (await sql`SELECT * FROM artists WHERE id = ${id}`) as Artist[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Artist not found' });
        return;
    }

    res.json(rows[0]);
});

// POST /api/artists - create an artist (added to the shared catalog)
router.post('/', requireAuth, catalogCreateLimiter, async (req, res) => {
    const { name, page_link } = (req.body ?? {}) as Partial<Artist>;

    if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
    }

    const rows = (await sql`
        INSERT INTO artists (name, page_link, created_by)
        VALUES (${name}, ${page_link ?? null}, ${req.userId})
        RETURNING *
    `) as Artist[];

    res.status(201).json(rows[0]);
});

// PUT /api/artists/:id - update an artist
router.put('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { name, page_link } = (req.body ?? {}) as Partial<Artist>;

    const rows = (await sql`
        UPDATE artists
        SET name = ${name}, page_link = ${page_link ?? null}
        WHERE id = ${id}
        RETURNING *
    `) as Artist[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Artist not found' });
        return;
    }

    res.json(rows[0]);
});

// DELETE /api/artists/:id - delete an artist
router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const rows = (await sql`DELETE FROM artists WHERE id = ${id} RETURNING *`) as Artist[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Artist not found' });
        return;
    }

    res.status(204).send(); // 204 - success
});

export default router;