-- Add session metadata columns
alter table public.sessions
  add column if not exists session_name text,
  add column if not exists date_is_hidden boolean not null default true;
