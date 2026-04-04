-- ============================================================
-- Migration 001 — Add schedule fields to profiles
-- Run this in: Supabase Dashboard → SQL Editor
-- (Only needed if you already ran the original schema.sql)
-- ============================================================

alter table public.profiles
  add column if not exists awake_start        smallint not null default 7,
  add column if not exists awake_end          smallint not null default 22,
  add column if not exists utc_offset_minutes integer  not null default 0;

-- Remove gamification tables if they exist
drop table if exists public.meditation_logs;
drop table if exists public.user_stats;
