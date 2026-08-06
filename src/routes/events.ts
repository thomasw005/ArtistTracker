import { Router } from 'express';
import { sql } from '../db.js';
import { requireAuth } from '../auth/requireAuth.js';
import { optionalAuth } from '../auth/optionalAuth.js';
import { catalogCreateLimiter } from '../middleware/rateLimit.js';
import { catalogEditError, type CatalogGuardRow } from '../auth/catalogPermissions.js';
import type {
    Event,
    EventDetailRow,
    EventListRowWithRatings,
    LineupRow,
    PerformanceInput,
    RatingAggregates,
} from '../types.js';

const router = Router();

// GET /api/events - list all events (lean: enough to render a row + navigate)
router.get('/', optionalAuth, async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const pattern = `%${search}%`;
    const events = (await sql`
        SELECT e.id, e.name, e.event_date, e.venue_id, e.festival_id,
               e.created_by, e.verified,
               v.name AS venue_name,
               f.name AS festival_name, f.year AS festival_year,
               (SELECT ROUND(AVG(ue.rating), 2) FROM user_events ue WHERE ue.event_id = e.id) AS avg_rating,
               (SELECT COUNT(ue.rating)::int    FROM user_events ue WHERE ue.event_id = e.id) AS rating_count,
               (SELECT ue.rating FROM user_events ue
                 WHERE ue.event_id = e.id AND ue.user_id = ${req.userId ?? null}) AS my_rating
        FROM events e
        LEFT JOIN venues v    ON v.id = e.venue_id
        LEFT JOIN festivals f ON f.id = e.festival_id
        WHERE COALESCE(e.name, '') ILIKE ${pattern}
        ORDER BY e.event_date DESC
    `) as EventListRowWithRatings[];
    res.json(events);
});

// GET /api/events/:id - get one event (rich: nested venue, festival, and lineup)
router.get('/:id', optionalAuth, async (req, res) => {
    const { id } = req.params;
    const rows = (await sql`
        SELECT e.*,
               v.name AS venue_name, v.city AS venue_city, v.country AS venue_country,
               f.name AS festival_name, f.year AS festival_year,
               (SELECT ROUND(AVG(ue.rating), 2) FROM user_events ue WHERE ue.event_id = e.id) AS avg_rating,
               (SELECT COUNT(ue.rating)::int    FROM user_events ue WHERE ue.event_id = e.id) AS rating_count,
               (SELECT ue.rating FROM user_events ue
                 WHERE ue.event_id = e.id AND ue.user_id = ${req.userId ?? null}) AS my_rating
        FROM events e
        LEFT JOIN venues v    ON v.id = e.venue_id
        LEFT JOIN festivals f ON f.id = e.festival_id
        WHERE e.id = ${id}
    `) as (EventDetailRow & RatingAggregates)[];

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
        verified: row.verified,
        created_by: row.created_by,
        event_date: row.event_date,
        avg_rating: row.avg_rating,
        rating_count: row.rating_count,
        my_rating: row.my_rating,
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
router.post('/', requireAuth, catalogCreateLimiter, async (req, res) => {
    const { name, event_date, venue_id, festival_id, artists } =
        (req.body ?? {}) as Partial<Event> & { artists?: PerformanceInput[] };

    if (!event_date) {
        res.status(400).json({ error: 'event_date is required' });
        return;
    }

    const [event] = (await sql`
        INSERT INTO events (name, event_date, venue_id, festival_id, created_by)
        VALUES (${name ?? null}, ${event_date}, ${venue_id ?? null}, ${festival_id ?? null}, ${req.userId})
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

// PUT /api/events/:id - update an event (creator or admin only)
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

    const [existing] = (await sql`
        SELECT created_by, verified FROM events WHERE id = ${id}
    `) as CatalogGuardRow[];

    const permError = catalogEditError(existing, req);
    if (permError) {
        res.status(permError.status).json({ error: permError.message });
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

    res.json(rows[0]);
});

// DELETE /api/events/:id - delete an event (creator or admin only)
router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    const [existing] = (await sql`
        SELECT created_by, verified FROM events WHERE id = ${id}
    `) as CatalogGuardRow[];

    const permError = catalogEditError(existing, req);
    if (permError) {
        res.status(permError.status).json({ error: permError.message });
        return;
    }

    const rows = (await sql`DELETE FROM events WHERE id = ${id} RETURNING *`) as Event[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }

    res.status(204).send(); // 204 - success
});

export default router;