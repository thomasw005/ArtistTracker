import { Router } from 'express';
import { sql } from '../db.js';
import type { Festival } from '../types.js';

const router = Router();

// GET /api/festivals - list all festivals
router.get('/', async (req, res) => {
    const festivals = (await sql`SELECT * FROM festivals ORDER BY year DESC, name`) as Festival[];
    res.json(festivals);
});

// GET /api/festivals/:id - get one festival
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const rows = (await sql`SELECT * FROM festivals WHERE id = ${id}`) as Festival[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Festival not found' });
        return;
    }

    res.json(rows[0]);
});

// POST /api/festivals - create a festival
router.post('/', async (req, res) => {
    const { name, price, year } = (req.body ?? {}) as Partial<Festival>;

    if (!name || price == null || year == null) {
        res.status(400).json({ error: 'name, price, and year are required' });
        return;
    }

    const rows = (await sql`
        INSERT INTO festivals (name, price, year)
        VALUES (${name}, ${price}, ${year})
        RETURNING *
    `) as Festival[];

    res.status(201).json(rows[0]);
});

// PUT /api/festivals/:id - update a festival
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price, year } = (req.body ?? {}) as Partial<Festival>;

    const rows = (await sql`
        UPDATE festivals
        SET name = ${name}, price = ${price}, year = ${year}
        WHERE id = ${id}
        RETURNING *
    `) as Festival[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Festival not found' });
        return;
    }

    res.json(rows[0]);
});

// DELETE /api/festivals/:id - delete a festival
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const rows = (await sql`DELETE FROM festivals WHERE id = ${id} RETURNING *`) as Festival[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Festival not found' });
        return;
    }

    res.status(204).send(); // 204 - success
});

export default router;