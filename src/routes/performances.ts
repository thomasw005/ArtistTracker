import { Router } from 'express';
import { sql } from '../db.js';
import { requireAuth } from '../auth/requireAuth.js';
import { requireAdmin } from '../auth/requireAdmin.js';
import type { Performance, PerformanceRow } from '../types.js';

const router = Router();

// GET /api/performances - list all performances, with artist & event context
router.get('/', async (req, res) => {
    const performances = (await sql`
        SELECT p.event_id, p.artist_id, p.created_by, p.verified,
               a.name AS artist_name,
               e.event_date
        FROM performances p
        JOIN artists a ON a.id = p.artist_id
        JOIN events  e ON e.id = p.event_id
        ORDER BY e.event_date DESC, a.name
    `) as PerformanceRow[];

    res.json(performances);
});

// GET /api/performances/:eventId/:artistId - get one performance
router.get('/:eventId/:artistId', async (req, res) => {
    const { eventId, artistId } = req.params;
    const rows = (await sql`
        SELECT p.event_id, p.artist_id, p.created_by, p.verified,
               a.name AS artist_name,
               e.event_date
        FROM performances p
        JOIN artists a ON a.id = p.artist_id
        JOIN events  e ON e.id = p.event_id
        WHERE p.event_id = ${eventId} AND p.artist_id = ${artistId}
    `) as PerformanceRow[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Performance not found' });
        return;
    }

    res.json(rows[0]);
});

// POST /api/performances - record that an artist performed at an event
// (admin only, until per-user contribution permissions exist)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    const { event_id, artist_id } = (req.body ?? {}) as Partial<Performance>;

    if (event_id == null || artist_id == null) {
        res.status(400).json({ error: 'event_id and artist_id are required' });
        return;
    }

    const [row] = (await sql`
        INSERT INTO performances (event_id, artist_id, created_by)
        VALUES (${event_id}, ${artist_id}, ${req.userId})
        RETURNING *
    `) as Performance[];
    res.status(201).json(row);
});

// DELETE /api/performances/:eventId/:artistId - remove a performance (admin only)
router.delete('/:eventId/:artistId', requireAuth, requireAdmin, async (req, res) => {
    const { eventId, artistId } = req.params;
    const rows = (await sql`
        DELETE FROM performances
        WHERE event_id = ${eventId} AND artist_id = ${artistId}
        RETURNING *
    `) as Performance[];
    if (rows.length === 0) {
        res.status(404).json({ error: 'Performance not found' });
        return;
    }
    res.status(204).send();
});

export default router;