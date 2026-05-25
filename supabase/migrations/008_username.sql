-- Add username column to profiles
alter table public.profiles
  add column if not exists username text unique;

-- Allow users to read/write their own username via RLS
-- (existing RLS policies on profiles already cover this)
