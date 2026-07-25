import { Router } from 'express';
import { sql } from '../db.js';
import { requireAuth } from '../auth/requireAuth.js';
import { catalogCreateLimiter } from '../middleware/rateLimit.js';
import { catalogEditError, type CatalogGuardRow } from '../auth/catalogPermissions.js';
import type { Festival } from '../types.js';

const router = Router();

// GET /api/festivals - list festivals, optionally filtered by ?search=
router.get('/', async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const pattern = `%${search}%`;
    const festivals = (await sql`
        SELECT * FROM festivals WHERE name ILIKE ${pattern} ORDER BY year DESC, name
    `) as Festival[];
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

// PUT /api/festivals/:id - update a festival (creator or admin only)
router.put('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { name, year } = (req.body ?? {}) as Partial<Festival>;

    const [existing] = (await sql`
        SELECT created_by, verified FROM festivals WHERE id = ${id}
    `) as CatalogGuardRow[];

    const permError = catalogEditError(existing, req);
    if (permError) {
        res.status(permError.status).json({ error: permError.message });
        return;
    }

    const rows = (await sql`
        UPDATE festivals
        SET name = ${name}, year = ${year}
        WHERE id = ${id}
        RETURNING *
    `) as Festival[];

    res.json(rows[0]);
});

// DELETE /api/festivals/:id - delete a festival (creator or admin only)
router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    const [existing] = (await sql`
        SELECT created_by, verified FROM festivals WHERE id = ${id}
    `) as CatalogGuardRow[];

    const permError = catalogEditError(existing, req);
    if (permError) {
        res.status(permError.status).json({ error: permError.message });
        return;
    }

    await sql`DELETE FROM festivals WHERE id = ${id}`;
    res.status(204).send(); // 204 - success
});

export default router;