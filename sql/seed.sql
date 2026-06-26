-- Artists
INSERT INTO artists (name, rating, page_link) VALUES
  ('Radiohead',      5, 'https://radiohead.com'),
  ('Kendrick Lamar', 5, 'https://oklama.com'),
  ('Tame Impala',    4, 'https://tameimpala.com'),
  ('deadmau5',       4, 'https://deadmau5.com');

INSERT INTO venues (name, city, rating, country) VALUES
  ('Brixton Academy',          'London',    5, 'UK'),   -- id 1
  ('Hakkasan',                 'Las Vegas', 3, 'USA'),  -- id 2
  ('Las Vegas Motor Speedway', 'Las Vegas', 4, 'USA');  -- id 3: the grounds

INSERT INTO festivals (name, price, year) VALUES
  ('EDC', 400.00, 2026);

INSERT INTO events (price, event_date, venue_id, festival_id, notes) VALUES
  (45.00, '2023-05-20', 1, NULL, 'Brixton show'),        -- venue only
  (NULL,  '2026-05-15', 3, 1,    'EDC Day 1'),            -- grounds + festival
  (NULL,  '2026-05-16', 3, 1,    'EDC Day 2'),
  (NULL,  '2026-05-17', 3, 1,    'EDC Day 3'),
  (60.00, '2026-05-17', 2, 1,    'EDC Day 3 afterparty'); -- different venue + festival

-- Performances (who I saw at each event, with a per-set rating)
INSERT INTO performances (event_id, artist_id, rating) VALUES
  (1, 1, 5),   -- Radiohead @ Brixton
  (2, 2, 5),   -- Kendrick @ EDC Day 1
  (2, 3, 4),   -- Tame Impala @ EDC Day 1
  (3, 4, 5),   -- deadmau5 @ EDC Day 2
  (4, 3, 4),   -- Tame Impala @ EDC Day 3
  (5, 4, 4);   -- deadmau5 @ the afterparty
