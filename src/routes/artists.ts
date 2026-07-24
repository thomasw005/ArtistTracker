import { Router } from 'express';
import { sql } from '../db.js';
import type { Artist } from '../types.js';

const router = Router();

// GET /api/artists - list all artists
router.get('/', async (req, res) => {
    const artists = (await sql`SELECT * FROM artists ORDER BY name`) as Artist[];
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

// POST /api/artists - create an artist
router.post('/', async (req, res) => {
    const { name, rating, page_link } = (req.body ?? {}) as Partial<Artist>;

    if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
    }

    const rows = (await sql`
        INSERT INTO artists (name, rating, page_link)
        VALUES (${name}, ${rating ?? null}, ${page_link ?? null})
        RETURNING *
    `) as Artist[];

    res.status(201).json(rows[0]);
});

// PUT /api/artists/:id - update an artist
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, rating, page_link } = (req.body ?? {}) as Partial<Artist>;

    const rows = (await sql`
        UPDATE artists
        SET name = ${name}, rating = ${rating ?? null}, page_link = ${page_link ?? null}
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
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const rows = (await sql`DELETE FROM artists WHERE id = ${id} RETURNING *`) as Artist[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Artist not found' });
        return;
    }

    res.status(204).send(); // 204 - success
});

export default router;