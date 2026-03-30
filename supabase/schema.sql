-- ============================================================
-- Executive Meditator — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension (already enabled by default on Supabase)
create extension if not exists "uuid-ossp";

-- ============================================================
-- profiles — one row per user, stores OneSignal ID and prefs
-- ============================================================
create table if not exists public.profiles (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  onesignal_player_id text,
  current_week  smallint not null default 1 check (current_week between 1 and 3),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- user_stats — aggregated meditation metrics per user
-- ============================================================
create table if not exists public.user_stats (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  total_sessions        integer not null default 0,
  completed_today       integer not null default 0,
  streak                integer not null default 0,
  total_points          integer not null default 0,
  badges                text[]  not null default '{}',
  oneness_reached       boolean not null default false,
  weekly_completion_rate numeric(4,3) not null default 0,
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- meditation_logs — one row per completed or skipped session
-- ============================================================
create table if not exists public.meditation_logs (
  id               text primary key,
  user_id          uuid not null references auth.users (id) on delete cascade,
  started_at       timestamptz not null,
  completed_at     timestamptz not null,
  duration_seconds integer not null default 10,
  week             smallint not null check (week between 1 and 3),
  skipped          boolean not null default false,
  points_earned    integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists meditation_logs_user_started
  on public.meditation_logs (user_id, started_at desc);

-- ============================================================
-- Row-Level Security (RLS) — users can only access their own data
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.user_stats      enable row level security;
alter table public.meditation_logs enable row level security;

-- profiles
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = user_id);

-- user_stats
create policy "user_stats: own row" on public.user_stats
  for all using (auth.uid() = user_id);

-- meditation_logs
create policy "meditation_logs: own rows" on public.meditation_logs
  for all using (auth.uid() = user_id);

-- ============================================================
-- Auto-create a profile row when a new user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict do nothing;

  insert into public.user_stats (user_id)
  values (new.id)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
