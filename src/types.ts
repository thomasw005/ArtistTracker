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
  created_by: number | null;
  verified: boolean;
  created_at: string;
}

export interface Venue {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
  created_by: number | null;
  verified: boolean;
  created_at: string;
}

export interface Festival {
  id: number;
  name: string;
  year: number;
  created_by: number | null;
  verified: boolean;
  created_at: string;
}

export interface Event {
  id: number;
  name: string | null;
  event_date: string;
  venue_id: number | null;
  festival_id: number | null;
  created_by: number | null;
  verified: boolean;
}

export interface Performance {
  event_id: number;
  artist_id: number;
  created_by: number | null;
  verified: boolean;
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
  created_by: number | null;
  verified: boolean;
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

/**
 * The lineup query on GET /api/events/:id. id/name/page_link describe the
 * artist; created_by/verified describe the lineup entry itself — who claimed
 * this artist played, and whether that claim has been vetted.
 */
export interface LineupRow {
  id: number;
  name: string;
  page_link: string | null;
  created_by: number | null;
  verified: boolean;
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

// --- Junction rows: RETURNING * from the user_* tables (PUT responses). ---
// NUMERIC comes back from Postgres as a string, same as Festival/Event price.

export interface UserArtist {
  user_id: number;
  artist_id: number;
  rating: number | null;
  created_at: string;
}

export interface UserVenue {
  user_id: number;
  venue_id: number;
  rating: number | null;
  created_at: string;
}

export interface UserFestival {
  user_id: number;
  festival_id: number;
  price: string;
  created_at: string;
}

export interface UserEvent {
  user_id: number;
  event_id: number;
  rating: number | null;
  price: string | null;
  created_at: string;
}

export interface UserPerformance {
  user_id: number;
  event_id: number;
  artist_id: number;
  rating: number | null;
}

// --- Enriched "my list" rows: catalog columns + my personal columns (GET). ---

export interface MyArtist {
  id: number;
  name: string;
  page_link: string | null;
  rating: number | null;
  created_at: string;
}

export interface MyVenue {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
  rating: number | null;
  created_at: string;
}

export interface MyFestival {
  id: number;
  name: string;
  year: number;
  price: string;
  created_at: string;
}

export interface MyEvent {
  id: number;
  name: string | null;
  event_date: string;
  venue_id: number | null;
  festival_id: number | null;
  rating: number | null;
  price: string | null;
  created_at: string;
}

export interface MyPerformance {
  event_id: number;
  artist_id: number;
  artist_name: string;
  event_name: string | null;
  event_date: string;
  rating: number | null;
}

// --- Rating aggregates attached to public catalog reads. ---
// avg_rating is NUMERIC from AVG(), so it comes back as a string (or null when
// nobody has rated). rating_count is cast to int. my_rating is the current
// user's own rating, or null when logged out / unrated.

export interface RatingAggregates {
  avg_rating: string | null;
  rating_count: number;
  my_rating: number | null;
}

export interface ArtistWithRatings extends Artist, RatingAggregates {}
export interface VenueWithRatings extends Venue, RatingAggregates {}
export interface EventListRowWithRatings extends EventListRow, RatingAggregates {}

// A festival's rating is DERIVED from the ratings of its events, so both the
// community average and the user's own value are averages (NUMERIC -> string).
export interface FestivalWithRatings extends Festival {
  avg_rating: string | null;
  rating_count: number;
  my_rating: string | null;
}