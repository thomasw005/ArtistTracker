export interface User {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface Artist {
  id: number;
  name: string;
  page_link: string | null;
  created_at: string;
}

export interface Venue {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
  created_at: string;
}

export interface Festival {
  id: number;
  name: string;
  year: number;
  created_at: string;
}

export interface Event {
  id: number;
  name: string | null;
  event_date: string;
  venue_id: number | null;
  festival_id: number | null;
}

export interface Performance {
  event_id: number;
  artist_id: number;
}

// --- Shapes returned by the joined queries. ---
// These carry columns from more than one table, so they don't match a single
// table interface above. Columns from a LEFT JOIN are nullable: the joined row
// may not exist.

/** GET /api/events - lean list view. */
export interface EventListRow {
  id: number;
  name: string | null;
  event_date: string;
  venue_id: number | null;
  festival_id: number | null;
  venue_name: string | null;
  festival_name: string | null;
  festival_year: number | null;
}

/** GET /api/events/:id - all event columns plus aliased venue & festival columns. */
export interface EventDetailRow extends Event {
  venue_name: string | null;
  venue_city: string | null;
  venue_country: string | null;
  festival_name: string | null;
  festival_year: number | null;
}

/** The lineup query on GET /api/events/:id. */
export interface LineupRow {
  id: number;
  name: string;
  page_link: string | null;
}

/** GET /api/performances - performance plus artist & event context. */
export interface PerformanceRow extends Performance {
  artist_name: string;
  event_date: string;
}

/** One entry in the optional `artists` array on POST /api/events. */
export interface PerformanceInput {
  artist_id: number;
}