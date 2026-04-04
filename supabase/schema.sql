-- ============================================================
-- Executive Meditator — Supabase Schema (v2 — passive reminders)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- profiles — one row per user
-- Stores OneSignal ID and schedule settings for push automation
-- ============================================================
create table if not exists public.profiles (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  onesignal_player_id text,
  current_week        smallint not null default 1 check (current_week between 1 and 3),
  awake_start         smallint not null default 7  check (awake_start between 0 and 23),
  awake_end           smallint not null default 22 check (awake_end between 0 and 23),
  utc_offset_minutes  integer  not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table public.profiles enable row level security;

create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = user_id);

-- Edge Function uses service role key — needs to bypass RLS
-- (service role bypasses RLS automatically, no extra policy needed)

-- ============================================================
-- Auto-create profile on sign-up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
