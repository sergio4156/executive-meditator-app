-- Corporate inquiries table
-- Run this in your Supabase Dashboard → SQL Editor

create table if not exists public.corporate_inquiries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  company     text not null,
  email       text not null,
  phone       text,
  licenses    text not null,
  message     text,
  created_at  timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.corporate_inquiries enable row level security;

-- Only the service role (server-side API) can insert and read
create policy "Service role only"
  on public.corporate_inquiries
  for all
  using (false)
  with check (false);
