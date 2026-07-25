import { Router } from 'express';
import { sql } from '../db.js';
import type {
    MyArtist, MyVenue, MyFestival, MyEvent, MyPerformance,
    UserArtist, UserVenue, UserFestival, UserEvent, UserPerformance,
} from '../types.js';

const router = Router();

// This whole router is mounted behind requireAuth in server.ts, so req.userId
// is guaranteed to be set in every handler below. Every query is scoped to it.

// ---------------------------------------------------------------------------
// Artists  (rating)
// ---------------------------------------------------------------------------

router.get('/artists', async (req, res) => {
    const rows = (await sql`
        SELECT a.id, a.name, a.page_link, ua.rating, ua.created_at
        FROM user_artists ua
        JOIN artists a ON a.id = ua.artist_id
        WHERE ua.user_id = ${req.userId}
        ORDER BY a.name
    `) as MyArtist[];
    res.json(rows);
});

router.put('/artists/:artistId', async (req, res) => {
    const { artistId } = req.params;
    const { rating } = (req.body ?? {}) as { rating?: number | null };

    const [row] = (await sql`
        INSERT INTO user_artists (user_id, artist_id, rating)
        VALUES (${req.userId}, ${artistId}, ${rating ?? null})
        ON CONFLICT (user_id, artist_id) DO UPDATE SET rating = EXCLUDED.rating
        RETURNING *
    `) as UserArtist[];
    res.json(row);
});

router.delete('/artists/:artistId', async (req, res) => {
    const { artistId } = req.params;
    const rows = (await sql`
        DELETE FROM user_artists
        WHERE user_id = ${req.userId} AND artist_id = ${artistId}
        RETURNING *
    `) as UserArtist[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Not in your list' });
        return;
    }
    res.status(204).send();
});

// ---------------------------------------------------------------------------
// Venues  (rating)
// ---------------------------------------------------------------------------

router.get('/venues', async (req, res) => {
    const rows = (await sql`
        SELECT v.id, v.name, v.city, v.country, uv.rating, uv.created_at
        FROM user_venues uv
        JOIN venues v ON v.id = uv.venue_id
        WHERE uv.user_id = ${req.userId}
        ORDER BY v.name
    `) as MyVenue[];
    res.json(rows);
});

router.put('/venues/:venueId', async (req, res) => {
    const { venueId } = req.params;
    const { rating } = (req.body ?? {}) as { rating?: number | null };

    const [row] = (await sql`
        INSERT INTO user_venues (user_id, venue_id, rating)
        VALUES (${req.userId}, ${venueId}, ${rating ?? null})
        ON CONFLICT (user_id, venue_id) DO UPDATE SET rating = EXCLUDED.rating
        RETURNING *
    `) as UserVenue[];
    res.json(row);
});

router.delete('/venues/:venueId', async (req, res) => {
    const { venueId } = req.params;
    const rows = (await sql`
        DELETE FROM user_venues
        WHERE user_id = ${req.userId} AND venue_id = ${venueId}
        RETURNING *
    `) as UserVenue[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Not in your list' });
        return;
    }
    res.status(204).send();
});

// ---------------------------------------------------------------------------
// Festivals  (price — NOT NULL)
// ---------------------------------------------------------------------------

router.get('/festivals', async (req, res) => {
    const rows = (await sql`
        SELECT f.id, f.name, f.year, uf.price, uf.created_at
        FROM user_festivals uf
        JOIN festivals f ON f.id = uf.festival_id
        WHERE uf.user_id = ${req.userId}
        ORDER BY f.year DESC, f.name
    `) as MyFestival[];
    res.json(rows);
});

router.put('/festivals/:festivalId', async (req, res) => {
    const { festivalId } = req.params;
    const { price } = (req.body ?? {}) as { price?: number };

    if (price == null) {
        res.status(400).json({ error: 'price is required' });
        return;
    }

    const [row] = (await sql`
        INSERT INTO user_festivals (user_id, festival_id, price)
        VALUES (${req.userId}, ${festivalId}, ${price})
        ON CONFLICT (user_id, festival_id) DO UPDATE SET price = EXCLUDED.price
        RETURNING *
    `) as UserFestival[];
    res.json(row);
});

router.delete('/festivals/:festivalId', async (req, res) => {
    const { festivalId } = req.params;
    const rows = (await sql`
        DELETE FROM user_festivals
        WHERE user_id = ${req.userId} AND festival_id = ${festivalId}
        RETURNING *
    `) as UserFestival[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Not in your list' });
        return;
    }
    res.status(204).send();
});

// ---------------------------------------------------------------------------
// Events  (rating + price, both optional)
// ---------------------------------------------------------------------------

router.get('/events', async (req, res) => {
    const rows = (await sql`
        SELECT e.id, e.name, e.event_date, e.venue_id, e.festival_id,
               ue.rating, ue.price, ue.created_at
        FROM user_events ue
        JOIN events e ON e.id = ue.event_id
        WHERE ue.user_id = ${req.userId}
        ORDER BY e.event_date DESC
    `) as MyEvent[];
    res.json(rows);
});

router.put('/events/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const { rating, price } = (req.body ?? {}) as { rating?: number | null; price?: number | null };

    const [row] = (await sql`
        INSERT INTO user_events (user_id, event_id, rating, price)
        VALUES (${req.userId}, ${eventId}, ${rating ?? null}, ${price ?? null})
        ON CONFLICT (user_id, event_id)
        DO UPDATE SET rating = EXCLUDED.rating, price = EXCLUDED.price
        RETURNING *
    `) as UserEvent[];
    res.json(row);
});

router.delete('/events/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const rows = (await sql`
        DELETE FROM user_events
        WHERE user_id = ${req.userId} AND event_id = ${eventId}
        RETURNING *
    `) as UserEvent[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Not in your list' });
        return;
    }
    res.status(204).send();
});

// ---------------------------------------------------------------------------
// Performances  (composite key: event_id + artist_id, rating)
// ---------------------------------------------------------------------------

router.get('/performances', async (req, res) => {
    const rows = (await sql`
        SELECT p.event_id, p.artist_id,
               a.name AS artist_name,
               e.name AS event_name, e.event_date,
               up.rating
        FROM user_performances up
        JOIN performances p ON p.event_id = up.event_id AND p.artist_id = up.artist_id
        JOIN artists a ON a.id = up.artist_id
        JOIN events  e ON e.id = up.event_id
        WHERE up.user_id = ${req.userId}
        ORDER BY e.event_date DESC, a.name
    `) as MyPerformance[];
    res.json(rows);
});

router.put('/performances/:eventId/:artistId', async (req, res) => {
    const { eventId, artistId } = req.params;
    const { rating } = (req.body ?? {}) as { rating?: number | null };

    const [row] = (await sql`
        INSERT INTO user_performances (user_id, event_id, artist_id, rating)
        VALUES (${req.userId}, ${eventId}, ${artistId}, ${rating ?? null})
        ON CONFLICT (user_id, event_id, artist_id) DO UPDATE SET rating = EXCLUDED.rating
        RETURNING *
    `) as UserPerformance[];
    res.json(row);
});

router.delete('/performances/:eventId/:artistId', async (req, res) => {
    const { eventId, artistId } = req.params;
    const rows = (await sql`
        DELETE FROM user_performances
        WHERE user_id = ${req.userId} AND event_id = ${eventId} AND artist_id = ${artistId}
        RETURNING *
    `) as UserPerformance[];

    if (rows.length === 0) {
        res.status(404).json({ error: 'Not in your list' });
        return;
    }
    res.status(204).send();
});

export default router;