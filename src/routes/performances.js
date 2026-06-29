import { Router } from 'express';
import { sql } from '../db.js';

const router = Router();

// GET /api/performances - list all performances, with artist & event context
router.get('/', async (req, res) => {
    const performances = await sql`
        SELECT p.event_id, p.artist_id, p.rating,
               a.name AS artist_name,
               e.event_date
        FROM performances p
        JOIN artists a ON a.id = p.artist_id
        JOIN events  e ON e.id = p.event_id
        ORDER BY e.event_date DESC, a.name
    `;

    res.json(performances);
});

// GET /api/performances/:eventId/:artistId - get one performance
router.get('/:eventId/:artistId', async (req, res) => {
    const { eventId, artistId } = req.params;
    const rows = await sql`
        SELECT p.event_id, p.artist_id, p.rating,
               a.name AS artist_name,
               e.event_date
        FROM performances p
        JOIN artists a ON a.id = p.artist_id
        JOIN events  e ON e.id = p.event_id
        WHERE p.event_id = ${eventId} AND p.artist_id = ${artistId}
    `;

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Performance not found' });
    }

    res.json(rows[0]);
});

// POST /api/performances - record that an artist performed at an event
router.post('/', async (req, res) => {
    const { event_id, artist_id, rating } = req.body ?? {};

    if (event_id == null || artist_id == null) {
        return res.status(400).json({ error: 'event_id and artist_id are required' });
    }

    const [row] = await sql`
        INSERT INTO performances (event_id, artist_id, rating)
        VALUES (${event_id}, ${artist_id}, ${rating ?? null})
        RETURNING *
    `;
    res.status(201).json(row);
});

// PUT /api/performances/:eventId/:artistId - update a performance's rating
router.put('/:eventId/:artistId', async (req, res) => {
    const { eventId, artistId } = req.params;
    const { rating } = req.body ?? {};

    const rows = await sql`
        UPDATE performances
        SET rating = ${rating ?? null}
        WHERE event_id = ${eventId} AND artist_id = ${artistId}
        RETURNING *
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Performance not found' });
    res.json(rows[0]);
});

// DELETE /api/performances/:eventId/:artistId - remove a performance
router.delete('/:eventId/:artistId', async (req, res) => {
    const { eventId, artistId } = req.params;
    const rows = await sql`
        DELETE FROM performances
        WHERE event_id = ${eventId} AND artist_id = ${artistId}
        RETURNING *
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Performance not found' });
    res.status(204).send();
});

export default router;