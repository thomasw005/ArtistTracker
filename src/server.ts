import express, { type ErrorRequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import { sql } from './db.js';
import authRouter from './routes/auth.js';
import artistsRouter from './routes/artists.js';
import venuesRouter from './routes/venues.js';
import festivalsRouter from './routes/festivals.js';
import eventsRouter from './routes/events.js';
import performancesRouter from './routes/performances.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRouter);
app.use('/api/artists', artistsRouter);
app.use('/api/venues', venuesRouter);
app.use('/api/festivals', festivalsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/performances', performancesRouter);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/health/db', async (req, res) => {
    const rows = await sql`SELECT now() AS time`;
    res.json({ status: 'ok', db_time: rows[0].time });
});

// Central error handler. Most-specific checks first, generic fallback last.
// Express only recognises this as an error handler if it takes all four params,
// so `next` stays even though it is unused.
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);

  // Malformed JSON in the request body (thrown by express.json())
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON in request body' });
    return;
  }

  // Postgres constraint violations (23xxx) = bad data from the client -> 400
  if (err.code && err.code.startsWith('23')) {
    res.status(400).json({ error: err.detail ?? err.message });
    return;
  }

  // Postgres data exceptions (22xxx), e.g. 22P02 invalid id like /artists/abc -> 400
  if (err.code && err.code.startsWith('22')) {
    res.status(400).json({ error: 'Invalid input syntax' });
    return;
  }

  // Anything else = unexpected server error
  res.status(500).json({ error: 'Internal server error' });
};

app.use(errorHandler);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});