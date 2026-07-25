-- =============================================================================
-- Shared catalog: objective facts, the same for everyone.
-- No ratings or prices here anymore — those are personal (see the user_* tables).
-- =============================================================================

-- Artists
INSERT INTO artists (name, page_link) VALUES
  ('Radiohead',      'https://radiohead.com'),   -- id 1
  ('Kendrick Lamar', 'https://oklama.com'),      -- id 2
  ('Tame Impala',    'https://tameimpala.com'),  -- id 3
  ('deadmau5',       'https://deadmau5.com');    -- id 4

-- Venues
INSERT INTO venues (name, city, country) VALUES
  ('Brixton Academy',          'London',    'UK'),   -- id 1
  ('Hakkasan',                 'Las Vegas', 'USA'),  -- id 2
  ('Las Vegas Motor Speedway', 'Las Vegas', 'USA');  -- id 3: the grounds

-- Festivals
INSERT INTO festivals (name, year) VALUES
  ('EDC', 2026);   -- id 1

-- Events (one row per day/session, name is the canonical label)
INSERT INTO events (name, event_date, venue_id, festival_id) VALUES
  ('Brixton show',         '2023-05-20', 1,    NULL),  -- id 1: venue only
  ('EDC Day 1',            '2026-05-15', 3,    1),     -- id 2: grounds + festival
  ('EDC Day 2',            '2026-05-16', 3,    1),     -- id 3
  ('EDC Day 3',            '2026-05-17', 3,    1),     -- id 4
  ('EDC Day 3 afterparty', '2026-05-17', 2,    1);     -- id 5: different venue + festival

-- Performances: who played each event (the lineup — no rating, that's personal)
INSERT INTO performances (event_id, artist_id) VALUES
  (1, 1),   -- Radiohead @ Brixton
  (2, 2),   -- Kendrick @ EDC Day 1
  (2, 3),   -- Tame Impala @ EDC Day 1
  (3, 4),   -- deadmau5 @ EDC Day 2
  (4, 3),   -- Tame Impala @ EDC Day 3
  (5, 4);   -- deadmau5 @ the afterparty

-- =============================================================================
-- A demo user, plus their personal layer over the catalog above.
-- Login: demo@example.com / password123  (hash is bcrypt, 12 rounds)
-- The user_* rows below hold the ratings/prices that used to live on the
-- shared tables. On this freshly-created schema the demo user is id 1.
-- =============================================================================

INSERT INTO users (email, username, password_hash) VALUES
  ('demo@example.com', 'demo',
   '$2b$12$BbrsAMCbQSr7HE05I8z7L.b9wWJK8YvXPU0Geaq1ppUUTku0GgwCe');  -- id 1

-- How this user rates each artist
INSERT INTO user_artists (user_id, artist_id, rating) VALUES
  (1, 1, 5),   -- Radiohead
  (1, 2, 5),   -- Kendrick Lamar
  (1, 3, 4),   -- Tame Impala
  (1, 4, 4);   -- deadmau5

-- How this user rates each venue
INSERT INTO user_venues (user_id, venue_id, rating) VALUES
  (1, 1, 5),   -- Brixton Academy
  (1, 2, 3),   -- Hakkasan
  (1, 3, 4);   -- Las Vegas Motor Speedway

-- Festivals this user attended, and what they paid
INSERT INTO user_festivals (user_id, festival_id, price) VALUES
  (1, 1, 400.00);   -- EDC

-- Events this user attended: their overall rating of the night and what they paid.
-- (Festival days are covered by the festival price above, so per-event price is NULL.)
INSERT INTO user_events (user_id, event_id, rating, price) VALUES
  (1, 1, 5, 45.00),
  (1, 2, 5, NULL),
  (1, 3, 4, NULL),
  (1, 4, 4, NULL),
  (1, 5, 3, 60.00);

-- How this user rated each individual set (per-performance)
INSERT INTO user_performances (user_id, event_id, artist_id, rating) VALUES
  (1, 1, 1, 5),   -- Radiohead @ Brixton
  (1, 2, 2, 5),   -- Kendrick @ EDC Day 1
  (1, 2, 3, 4),   -- Tame Impala @ EDC Day 1
  (1, 3, 4, 5),   -- deadmau5 @ EDC Day 2
  (1, 4, 3, 4),   -- Tame Impala @ EDC Day 3
  (1, 5, 4, 4);   -- deadmau5 @ the afterparty
