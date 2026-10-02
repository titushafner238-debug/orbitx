-- ORBIT / OrbitX D1 database schema
-- Safe to import into a new Cloudflare D1 database.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('movie', 'show')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  year INTEGER,
  runtime_minutes INTEGER,
  rating TEXT DEFAULT '',
  poster_url TEXT DEFAULT '',
  backdrop_url TEXT DEFAULT '',
  trailer_url TEXT DEFAULT '',
  video_url TEXT DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'published')),
  release_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS genres (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS content_genres (
  content_id TEXT NOT NULL,
  genre_id TEXT NOT NULL,
  PRIMARY KEY (content_id, genre_id),
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL,
  season_number INTEGER NOT NULL,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (show_id, season_number),
  FOREIGN KEY (show_id) REFERENCES content(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  runtime_minutes INTEGER,
  thumbnail_url TEXT DEFAULT '',
  video_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'published')),
  release_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (season_id, episode_number),
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_type_status
  ON content(type, status);

CREATE INDEX IF NOT EXISTS idx_content_release
  ON content(release_at);

CREATE INDEX IF NOT EXISTS idx_content_featured
  ON content(featured, status);

CREATE INDEX IF NOT EXISTS idx_content_genres_genre
  ON content_genres(genre_id);

CREATE INDEX IF NOT EXISTS idx_seasons_show
  ON seasons(show_id, season_number);

CREATE INDEX IF NOT EXISTS idx_episodes_release
  ON episodes(release_at);

CREATE INDEX IF NOT EXISTS idx_episodes_season
  ON episodes(season_id, episode_number);
