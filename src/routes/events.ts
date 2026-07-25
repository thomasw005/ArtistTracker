import { Router } from 'express';
import { sql } from '../db.js';
import { requireAuth } from '../auth/requireAuth.js';
import type {
    Event,
    EventDetailRow,
    EventListRow,
    LineupRow,
    PerformanceInput,
} from '../types.js';

const router = Router();

// GET /api/events - list all events (lean: enough to render a row + navigate)
router.get('/', async (req, res) => {
    const events = (await sql`
        SELECT e.id, e.name, e.event_date, e.venue_id, e.festival_id,
               v.name AS venue_name,
               f.name AS festival_name, f.year AS festival_year
        FROM events e
        LEFT JOIN venues v    ON v.id = e.venue_id
        LEFT JOIN festivals f ON f.id = e.festival_id
        ORDER BY e.event_date DESC
    `) as EventListRow[];
    res.json(events);
});

// GET /api/events/:id - get one event (rich: nested venue, festival, and lineup)
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const rows = (await sql`
        SELECT e.*,
               v.name AS venue_name, v.city AS venue_city, v.country AS venue_country,
               f.name AS festival_name, f.year AS festival_year
        FROM events e
        LEFT JOIN venues v    ON v.id = e.venue_id
        LEFT JOIN festivals f ON f.id = e.festival_id
        WHERE e.id = ${id}
    `) as EventDetailRow[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }

    // The lineup (artists who performed at this event)
    const lineup = (await sql`
        SELECT a.id, a.name, a.page_link
        FROM performances p
        JOIN artists a ON a.id = p.artist_id
        WHERE p.event_id = ${id}
    `) as LineupRow[];

    // Reshape the flat join into nested objects. venue/festival are null when absent.
    const row = rows[0];
    res.json({
        id: row.id,
        name: row.name,
        event_date: row.event_date,
        venue: row.venue_id ? {
            id: row.venue_id,
            name: row.venue_name,
            city: row.venue_city,
            country: row.venue_country,
        } : null,
        festival: row.festival_id ? {
            id: row.festival_id,
            name: row.festival_name,
            year: row.festival_year,
        } : null,
        lineup,
    });
});

// POST /api/events - create an event
router.post('/', requireAuth, async (req, res) => {
    const { name, event_date, venue_id, festival_id, artists } =
        (req.body ?? {}) as Partial<Event> & { artists?: PerformanceInput[] };

    if (!event_date) {
        res.status(400).json({ error: 'event_date is required' });
        return;
    }

    const [event] = (await sql`
        INSERT INTO events (name, event_date, venue_id, festival_id)
        VALUES (${name ?? null}, ${event_date}, ${venue_id ?? null}, ${festival_id ?? null})
        RETURNING *
    `) as Event[];

    if (Array.isArray(artists)) {
        for (const a of artists) {
            await sql`
                INSERT INTO performances (event_id, artist_id)
                VALUES (${event.id}, ${a.artist_id})
            `;
        }
    }

    res.status(201).json(event);
});

// PUT /api/events/:id - update an event
router.put('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { name, event_date, venue_id, festival_id } = (req.body ?? {}) as Partial<Event>;

    if (!event_date) {
        res.status(400).json({ error: 'event_date is required' });
        return;
    }

    if (venue_id == null && festival_id == null) {
        res.status(400).json({ error: 'venue_id or festival_id is required' });
        return;
    }

    const rows = (await sql`
        UPDATE events
        SET name = ${name ?? null},
            event_date = ${event_date},
            venue_id = ${venue_id ?? null},
            festival_id = ${festival_id ?? null}
        WHERE id = ${id}
        RETURNING *
    `) as Event[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }

    res.json(rows[0]);
});

// DELETE /api/events/:id - delete an event
router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const rows = (await sql`DELETE FROM events WHERE id = ${id} RETURNING *`) as Event[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }

    res.status(204).send(); // 204 - success
});

export default router;