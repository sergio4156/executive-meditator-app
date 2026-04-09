-- Add payment tracking fields to profiles table
alter table profiles
  add column if not exists email text,
  add column if not exists is_paid boolean default false,
  add column if not exists stripe_session_id text,
  add column if not exists paid_at timestamptz;
