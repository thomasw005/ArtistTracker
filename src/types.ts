export interface Artist {
  id: number;
  name: string;
  rating: number | null;
  page_link: string | null;
  created_at: string;
}

export interface Venue {
  id: number;
  name: string;
  city: string | null;
  rating: number | null;
  country: string | null;
  created_at: string;
}

export interface Festival {
  id: number;
  name: string;
  price: string;
  year: number;
  created_at: string;
}

export interface Event {
  id: number;
  price: string | null;
  event_date: string;
  venue_id: number | null;
  festival_id: number | null;
  notes: string | null;
}

export interface Performance {
  event_id: number;
  artist_id: number;
  rating: number | null;
}

// --- Shapes returned by the joined queries. ---
// These carry columns from more than one table, so they don't match a single
// table interface above. Columns from a LEFT JOIN are nullable: the joined row
// may not exist.

/** GET /api/events - lean list view. */
export interface EventListRow {
  id: number;
  event_date: string;
  price: string | null;
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
  venue_rating: number | null;
  venue_country: string | null;
  festival_name: string | null;
  festival_year: number | null;
  festival_price: string | null;
}

/** The lineup query on GET /api/events/:id. */
export interface LineupRow {
  id: number;
  name: string;
  artist_rating: number | null;
  performance_rating: number | null;
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
  rating?: number | null;
}