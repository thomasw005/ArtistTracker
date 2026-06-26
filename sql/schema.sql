-- child tables first
DROP TABLE IF EXISTS performances;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS artists;
DROP TABLE IF EXISTS venues;
DROP TABLE IF EXISTS festivals;

CREATE TABLE artists (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
    page_link   TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE venues (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    city        TEXT,
    rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
    country     TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE festivals (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    price       NUMERIC NOT NULL,
    year        INTEGER NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);  

-- collection of performances for a given day
CREATE TABLE events (
    id          SERIAL PRIMARY KEY,
    price       NUMERIC,
    event_date  DATE NOT NULL,
    venue_id    INTEGER REFERENCES venues(id) ON DELETE SET NULL,
    festival_id INTEGER REFERENCES festivals(id) ON DELETE SET NULL,
    notes       TEXT,

    CONSTRAINT venue_or_festival CHECK (
        venue_id IS NOT NULL OR festival_id IS NOT NULL
    )
);

CREATE TABLE performances (
    event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    artist_id   INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
    PRIMARY KEY (event_id, artist_id)
);