import express from 'express';
import { sql } from './db.js';
import artistsRouter from './routes/artists.js';

const app = express();

app.use(express.json());
app.use('/api/artists', artistsRouter);

// Central error handler. Most-specific checks first, generic fallback last.
app.use((err, req, res, next) => {
  console.error(err);

  // Malformed JSON in the request body (thrown by express.json())
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  // Postgres constraint violations (23xxx) = bad data from the client -> 400
  if (err.code && err.code.startsWith('23')) {
    return res.status(400).json({ error: err.detail ?? err.message });
  }

  // Anything else = unexpected server error
  res.status(500).json({ error: 'Internal server error' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/health/db', async (req, res) => {
    const rows = await sql`SELECT now() AS time`;
    res.json({ status: 'ok', db_time: rows[0].time });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});