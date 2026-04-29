-- Add IANA time-zone identifier for DST-aware reminder scheduling.
-- The Edge Function prefers this over utc_offset_minutes when present;
-- the offset column stays as a fallback for users who haven't yet had
-- their time_zone populated (existing users on older app builds).
alter table public.profiles
  add column if not exists time_zone text;
