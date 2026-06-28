import express from 'express';
import { sql } from './db.js';

const app = express();

app.use(express.json());

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