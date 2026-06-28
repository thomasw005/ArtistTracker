import { Router } from 'express';
import { sql } from '../db.js';

const router = Router();

// GET /api/festivals - list all festivals
router.get('/', async (req, res) => {
    const festivals = await sql`SELECT * FROM festivals ORDER BY year DESC, name`;
    res.json(festivals);
});

// GET /api/festivals/:id - get one festival
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const rows = await sql`SELECT * FROM festivals WHERE id = ${id}`;

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Festival not found' });
    }

    res.json(rows[0]);
});

// POST /api/festivals - create a festival
router.post('/', async (req, res) => {
    const { name, price, year } = req.body ?? {};

    if (!name || price == null || year == null) {
        return res.status(400).json({ error: 'Name, price, and year are required' });
    }

    const rows = await sql`
        INSERT INTO festivals (name, price, year)
        VALUES (${name}, ${price}, ${year})
        RETURNING *
    `;

    res.status(201).json(rows[0]);
});

// PUT /api/festivals/:id - update a festival
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price, year } = req.body ?? {};

    const rows = await sql`
        UPDATE festivals
        SET name = ${name}, price = ${price}, year = ${year}
        WHERE id = ${id}
        RETURNING *
    `;

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Festival not found' });
    }

    res.json(rows[0]);
});

// DELETE /api/festivals/:id - delete a festival
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const rows = await sql`DELETE FROM festivals WHERE id = ${id} RETURNING *`;

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Festival not found' });
    }

    res.status(204).send(); // 204 - success
});

export default router;