create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  listening_setup text,
  favorite_genres text[] not null default '{}',
  listening_goal text,
  eq_profile jsonb,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  if lower(new.email) = 'dasadavit@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.user_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  artist text not null default 'Your library',
  cover text not null default '🎧',
  storage_path text not null,
  content_type text,
  size_bytes bigint,
  media_kind text not null default 'audio',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.user_tracks to authenticated;
grant all on public.user_tracks to service_role;
alter table public.user_tracks enable row level security;
create policy "own tracks" on public.user_tracks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.lyrics_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  track_key text not null,
  lines jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, track_key)
);
grant select, insert, update, delete on public.lyrics_cache to authenticated;
grant all on public.lyrics_cache to service_role;
alter table public.lyrics_cache enable row level security;
create policy "own lyrics" on public.lyrics_cache for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  minutes integer not null,
  intention text,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.focus_sessions to authenticated;
grant all on public.focus_sessions to service_role;
alter table public.focus_sessions enable row level security;
create policy "own focus" on public.focus_sessions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "settings public read" on public.site_settings for select to anon, authenticated using (true);
create policy "settings admin write" on public.site_settings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.changelog (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now()
);
grant select on public.changelog to anon, authenticated;
grant insert, update, delete on public.changelog to authenticated;
grant all on public.changelog to service_role;
alter table public.changelog enable row level security;
create policy "changelog public read" on public.changelog for select to anon, authenticated using (true);
create policy "changelog admin write" on public.changelog for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

alter publication supabase_realtime add table public.site_settings;
alter publication supabase_realtime add table public.changelog;

insert into public.site_settings (key, value) values
 ('hero', '{"concertTitle":"Come a little closer.","concertSub":"A small, warm room for the songs that mean something.","topCenter":"YOUR PERSONAL LISTENING ROOM"}'),
 ('announcement', '{"text":"","enabled":false}');
insert into public.changelog (version, title, body) values
 ('2.0', 'RESONA 2.0', 'Rebuilt 24D engine with bass-safe binaural orbit · Auto-play next · 10-band EQ and hearing check · Video room for your own files and YouTube · Head-tracked tilt · Auto-transcribed lyrics room · Focus sessions · Profiles and onboarding.');

create policy "user audio own read" on storage.objects for select to authenticated using (bucket_id = 'user-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user audio own insert" on storage.objects for insert to authenticated with check (bucket_id = 'user-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user audio own delete" on storage.objects for delete to authenticated using (bucket_id = 'user-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "public audio read" on storage.objects for select to anon, authenticated using (bucket_id = 'resona-public-audio');
create policy "public audio admin write" on storage.objects for insert to authenticated with check (bucket_id = 'resona-public-audio' and public.has_role(auth.uid(),'admin'));
create policy "public audio admin delete" on storage.objects for delete to authenticated using (bucket_id = 'resona-public-audio' and public.has_role(auth.uid(),'admin'));