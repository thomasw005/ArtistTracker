-- child tables first
DROP TABLE IF EXISTS user_performances;
DROP TABLE IF EXISTS user_events;
DROP TABLE IF EXISTS user_festivals;
DROP TABLE IF EXISTS user_venues;
DROP TABLE IF EXISTS user_artists;
DROP TABLE IF EXISTS performances;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS artists;
DROP TABLE IF EXISTS venues;
DROP TABLE IF EXISTS festivals;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    is_admin        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE artists (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    page_link       TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    verified        BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE venues (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    city            TEXT,
    country         TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    verified        BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE festivals (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    year            INTEGER NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    verified        BOOLEAN NOT NULL DEFAULT false
);

-- collection of performances for a given day
CREATE TABLE events (
    id              SERIAL PRIMARY KEY,
    name            TEXT,
    event_date      DATE NOT NULL,
    venue_id        INTEGER REFERENCES venues(id) ON DELETE SET NULL,
    festival_id     INTEGER REFERENCES festivals(id) ON DELETE SET NULL,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    verified        BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT venue_or_festival CHECK (
        venue_id IS NOT NULL OR festival_id IS NOT NULL
    )
);

CREATE TABLE performances (
    event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    artist_id       INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, artist_id)
);

CREATE TABLE user_artists (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artist_id  INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, artist_id)
);

CREATE TABLE user_venues (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id   INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, venue_id)
);

CREATE TABLE user_festivals (
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    festival_id  INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    price        NUMERIC NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, festival_id)
);

CREATE TABLE user_events (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
    price      NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, event_id)
);

-- per-user rating of a specific artist's set at a specific event
CREATE TABLE user_performances (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id   INTEGER NOT NULL,
    artist_id  INTEGER NOT NULL,
    rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
    PRIMARY KEY (user_id, event_id, artist_id),
    FOREIGN KEY (event_id, artist_id)
        REFERENCES performances(event_id, artist_id) ON DELETE CASCADE
);
