-- Add loop_enabled flag for the infinite 3-week-block reminder loop.
-- True (default) = continue cycling 60 → 30 → 15 → 60 → 30 → 15 → ...
-- False = stop reminders entirely (user opted out after first cycle).
alter table public.profiles
  add column if not exists loop_enabled boolean not null default true;
