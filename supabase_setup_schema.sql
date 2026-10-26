-- ============================================================
-- RESONA MASTER DATABASE SETUP SCRIPT
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zvarqbhkudfvvgxmdgup/sql/new
-- ============================================================

-- 1. Create app_role enum if it doesn't already exist
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Site Settings table (for Announcement Banner & Hero Typography)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO anon, authenticated, service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "site_settings_write" ON public.site_settings;
CREATE POLICY "site_settings_write" ON public.site_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default site settings if empty
INSERT INTO public.site_settings (key, value)
VALUES
  ('hero', '{"concertTitle":"Come a little closer.","concertSub":"A small, warm room for the songs that mean something.","topCenter":"YOUR PERSONAL LISTENING ROOM"}'::jsonb),
  ('announcement', '{"text":"","enabled":false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Create Update Log (Changelog) table
CREATE TABLE IF NOT EXISTS public.changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.changelog TO anon, authenticated, service_role;
ALTER TABLE public.changelog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "changelog_public_read" ON public.changelog;
CREATE POLICY "changelog_public_read" ON public.changelog
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "changelog_write" ON public.changelog;
CREATE POLICY "changelog_write" ON public.changelog
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.changelog (version, title, body)
VALUES
  ('2.0', 'RESONA 2.0 Released', 'Rebuilt 24D spatial audio engine with bass-safe binaural orbit, Focus Mode, Synchronized Lyrics Room, and dedicated Admin Control Suite.')
ON CONFLICT DO NOTHING;

-- 4. Enable Supabase Realtime for instant synchronization
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.changelog;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. Create Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  listening_setup text,
  favorite_genres text[] NOT NULL DEFAULT '{}',
  listening_goal text,
  eq_profile jsonb,
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.profiles TO authenticated, service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 6. Create User Roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

GRANT ALL ON public.user_roles TO authenticated, service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles_read_own" ON public.user_roles;
CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Helper function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Automatic user profile & admin assignment trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'user') ON CONFLICT DO NOTHING;
  IF LOWER(new.email) IN ('dasadavit@gmail.com', 'atharvasoundalgekar07@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Create User Tracks table (if not already created)
CREATE TABLE IF NOT EXISTS public.user_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  artist text NOT NULL DEFAULT 'Resona Library',
  cover text NOT NULL DEFAULT '🎧',
  storage_path text NOT NULL,
  content_type text,
  size_bytes bigint,
  media_kind text NOT NULL DEFAULT 'audio',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.user_tracks TO anon, authenticated, service_role;
ALTER TABLE public.user_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tracks_all_access" ON public.user_tracks;
CREATE POLICY "tracks_all_access" ON public.user_tracks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 8. Lyrics Cache & Focus Sessions
CREATE TABLE IF NOT EXISTS public.lyrics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_key text NOT NULL,
  lines jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_key)
);
GRANT ALL ON public.lyrics_cache TO authenticated, service_role;
ALTER TABLE public.lyrics_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lyrics_all" ON public.lyrics_cache;
CREATE POLICY "lyrics_all" ON public.lyrics_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  minutes integer NOT NULL,
  intention text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.focus_sessions TO authenticated, service_role;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "focus_all" ON public.focus_sessions;
CREATE POLICY "focus_all" ON public.focus_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
