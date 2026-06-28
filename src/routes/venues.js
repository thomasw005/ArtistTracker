import { Router } from 'express';
import { sql } from '../db.js';

const router = Router();

// GET /api/venues - list all venues
router.get('/', async (req, res) => {
    const venues = await sql`SELECT * FROM venues ORDER BY name`;
    res.json(venues);
});

// GET /api/venues/:id - get one venue
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const rows = await sql`SELECT * FROM venues WHERE id = ${id}`;

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Venue not found' });
    }

    res.json(rows[0]);
});

// POST /api/venues - create a venue
router.post('/', async (req, res) => {
    const { name, city, rating, country } = req.body ?? {};

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const rows = await sql`
        INSERT INTO venues (name, city, rating, country)
        VALUES (${name}, ${city ?? null}, ${rating ?? null}, ${country ?? null})
        RETURNING *
    `;

    res.status(201).json(rows[0]);
});

// PUT /api/venues/:id - update a venue
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, city, rating, country } = req.body ?? {};

    const rows = await sql`
        UPDATE venues
        SET name = ${name}, city = ${city ?? null}, rating = ${rating ?? null}, country = ${country ?? null}
        WHERE id = ${id}
        RETURNING *
    `;

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Venue not found' });
    }

    res.json(rows[0]);
});

// DELETE /api/venues/:id - delete a venue
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const rows = await sql`DELETE FROM venues WHERE id = ${id} RETURNING *`;

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Venue not found' });
    }

    res.status(204).send(); // 204 - success
});

export default router;