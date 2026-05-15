-- Migration: add 'adanos' as a valid platform value
-- The sources table has no CHECK constraint on platform so no enum change needed.
-- This migration adds the 4 Adanos virtual source rows and a partial index
-- for fast queries filtering by platform = 'adanos'.

-- Index for adanos-only mention queries
CREATE INDEX IF NOT EXISTS idx_mentions_adanos
  ON mentions (ticker_id, mentioned_at DESC)
  WHERE platform = 'adanos';

-- Seed the 4 Adanos virtual sources (idempotent via ON CONFLICT DO NOTHING)
INSERT INTO sources (name, platform, username, source_type, follower_count, verified)
VALUES
  ('Adanos — Reddit',     'adanos', 'reddit',     'publication', 0, true),
  ('Adanos — X',          'adanos', 'x',          'publication', 0, true),
  ('Adanos — News',       'adanos', 'news',        'publication', 0, true),
  ('Adanos — Polymarket', 'adanos', 'polymarket', 'publication', 0, true)
ON CONFLICT (platform, username) DO NOTHING;
