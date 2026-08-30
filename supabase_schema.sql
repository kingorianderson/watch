-- =======================================================
-- WATCH.FLIX - Supabase Database Setup Schema
-- Run this SQL in your Supabase Project -> SQL Editor -> Run
-- =======================================================

-- 1. Create Watchlist Table
CREATE TABLE IF NOT EXISTS public.watchlist (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    media_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    backdrop_path TEXT,
    type TEXT NOT NULL CHECK (type IN ('movie', 'tv')),
    vote_average NUMERIC DEFAULT 0,
    release_date TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_media UNIQUE (user_id, media_id)
);

-- 2. Create Watch History Table
CREATE TABLE IF NOT EXISTS public.watch_history (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    media_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    backdrop_path TEXT,
    type TEXT NOT NULL CHECK (type IN ('movie', 'tv')),
    season INTEGER,
    episode INTEGER,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_media_type UNIQUE (user_id, media_id, type)
);

-- 3. Create Indexes for High Performance Queries
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON public.watchlist (user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user ON public.watch_history (user_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- 5. Open Public Access Policies (Matching our frontend auth)
CREATE POLICY "Allow all actions on watchlist"
    ON public.watchlist
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all actions on watch_history"
    ON public.watch_history
    FOR ALL
    USING (true)
    WITH CHECK (true);

