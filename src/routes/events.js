import { Router } from 'express';
import { sql } from '../db.js';

const router = Router();

// GET /api/events - list all events (lean: enough to render a row + navigate)
router.get('/', async (req, res) => {
    const events = await sql`
        SELECT e.id, e.event_date, e.price, e.venue_id, e.festival_id,
               v.name AS venue_name,
               f.name AS festival_name, f.year AS festival_year
        FROM events e
        LEFT JOIN venues v    ON v.id = e.venue_id
        LEFT JOIN festivals f ON f.id = e.festival_id
        ORDER BY e.event_date DESC
    `;
    res.json(events);
});

// GET /api/events/:id - get one event (rich: nested venue, festival, and lineup)
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const rows = await sql`
        SELECT e.*,
               v.name AS venue_name, v.city AS venue_city, v.rating AS venue_rating, v.country AS venue_country,
               f.name AS festival_name, f.year AS festival_year, f.price AS festival_price
        FROM events e
        LEFT JOIN venues v    ON v.id = e.venue_id
        LEFT JOIN festivals f ON f.id = e.festival_id
        WHERE e.id = ${id}
    `;

    if (rows.length === 0) return res.status(404).json({ error: 'Event not found' });

    // The lineup (artists who performed at this event)
    const lineup = await sql`
        SELECT a.id, a.name, a.rating AS artist_rating, p.rating AS performance_rating, a.page_link
        FROM performances p
        JOIN artists a ON a.id = p.artist_id
        WHERE p.event_id = ${id}
    `;

    // Reshape the flat join into nested objects. venue/festival are null when absent.
    const row = rows[0];
    res.json({
        id: row.id,
        event_date: row.event_date,
        price: row.price,
        notes: row.notes,
        venue: row.venue_id ? {
            id: row.venue_id,
            name: row.venue_name,
            city: row.venue_city,
            rating: row.venue_rating,
            country: row.venue_country,
        } : null,
        festival: row.festival_id ? {
            id: row.festival_id,
            name: row.festival_name,
            year: row.festival_year,
            price: row.festival_price,
        } : null,
        lineup,
    });
});

// POST /api/events - create an event
router.post('/', async (req, res) => {
    const { price, event_date, venue_id, festival_id, notes, artists } = req.body ?? {};

    if (!event_date) {
        return res.status(400).json({ error: 'event_date is required' });
    }

    const [event] = await sql`
        INSERT INTO events (price, event_date, venue_id, festival_id, notes)
        VALUES (${price ?? null}, ${event_date}, ${venue_id ?? null}, ${festival_id ?? null}, ${notes ?? null})
        RETURNING *
    `;

    if (Array.isArray(artists)) {
        for (const a of artists) {
            await sql`
                INSERT INTO performances (event_id, artist_id, rating)
                VALUES (${event.id}, ${a.artist_id}, ${a.rating ?? null})
            `;
        }
    }

    res.status(201).json(event);
});

// PUT /api/events/:id - update an event
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { price, event_date, venue_id, festival_id, notes } = req.body ?? {};

    if (!event_date) {
        return res.status(400).json({ error: 'event_date is required' });
    }

    if (venue_id == null && festival_id == null) {
        return res.status(400).json({ error: 'venue_id or festival_id is required' });
    }

    const rows = await sql`
        UPDATE events
        SET price = ${price ?? null},
            event_date = ${event_date},
            venue_id = ${venue_id ?? null},
            festival_id = ${festival_id ?? null},
            notes = ${notes ?? null}
        WHERE id = ${id}
        RETURNING *
    `;

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
    }

    res.json(rows[0]);
});

// DELETE /api/events/:id - delete an event
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const rows = await sql`DELETE FROM events WHERE id = ${id} RETURNING *`;

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
    }

    res.status(204).send(); // 204 - success
});

export default router;