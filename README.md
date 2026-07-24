# ArtistTracker

A REST API for tracking artists, venues, festivals, events, and performances.

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Create a `.env` file in the project root with your Neon database connection string:

   ```
   DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>?sslmode=require
   ```

   Get this from your [Neon](https://neon.tech) dashboard under Project → Connection Details (use the pooled connection string).

3. Run the schema migration to create the tables:

   ```
   npm run migrate sql/schema.sql
   ```

   Optionally, seed some sample data:

   ```
   npm run migrate sql/seed.sql
   ```

4. Start the dev server:

   ```
   npm run dev
   ```

   The API will be running at `http://localhost:3000`. Check `http://localhost:3000/health` and `http://localhost:3000/health/db` to confirm it's up and connected to the database.

## Scripts

- `npm run dev` — start the server with auto-reload
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled server (`dist/server.js`)
- `npm run migrate <file>` — run a `.sql` file against the database

## API routes

- `/api/artists`
- `/api/venues`
- `/api/festivals`
- `/api/events`
- `/api/performances`

Each supports standard REST verbs (`GET`, `POST`, `PUT`, `DELETE`).
