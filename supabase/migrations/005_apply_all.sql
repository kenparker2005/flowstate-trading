-- ============================================================
-- 005_apply_all.sql
-- Safe to run multiple times. Applies all setup in one shot.
-- Run this in the Supabase SQL Editor if you haven't run
-- migrations 001–004 already, OR if you're not sure.
-- ============================================================

-- ── pgcrypto ────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id                    uuid references auth.users primary key,
  email                 text,
  is_subscribed         boolean default false,
  stripe_customer_id    text,
  stripe_subscription_id text,
  created_at            timestamptz default now()
);

alter table public.profiles enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Users can view own profile'
  ) then
    create policy "Users can view own profile"
      on public.profiles for select using (auth.uid() = id);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile"
      on public.profiles for update using (auth.uid() = id);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Users can insert own profile'
  ) then
    create policy "Users can insert own profile"
      on public.profiles for insert with check (auth.uid() = id);
  end if;
end $$;

-- ── auto-create profile on signup ───────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── pairs ────────────────────────────────────────────────────
create table if not exists public.pairs (
  id           serial primary key,
  symbol       text not null,
  display_name text,
  is_active    boolean default true
);

alter table public.pairs enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'pairs' and policyname = 'Anyone can read pairs'
  ) then
    create policy "Anyone can read pairs"
      on public.pairs for select using (true);
  end if;
end $$;

-- Seed ES/NQ (idempotent)
insert into public.pairs (symbol, display_name)
values ('ES', 'E-mini S&P 500'), ('NQ', 'E-mini Nasdaq-100')
on conflict do nothing;

-- ── sessions ─────────────────────────────────────────────────
create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id),
  pair_id      integer references public.pairs(id),
  timeframe    text,
  session_date date,
  started_at   timestamptz default now(),
  ended_at     timestamptz,
  status       text default 'active'
);

alter table public.sessions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'sessions' and policyname = 'Users can view own sessions'
  ) then
    create policy "Users can view own sessions"
      on public.sessions for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'sessions' and policyname = 'Users can insert own sessions'
  ) then
    create policy "Users can insert own sessions"
      on public.sessions for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'sessions' and policyname = 'Users can update own sessions'
  ) then
    create policy "Users can update own sessions"
      on public.sessions for update using (auth.uid() = user_id);
  end if;
end $$;

-- ── trades ───────────────────────────────────────────────────
create table if not exists public.trades (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid references public.sessions(id),
  user_id      uuid references public.profiles(id),
  direction    text,
  entry_price  numeric,
  exit_price   numeric,
  stop_loss    numeric,
  take_profit  numeric,
  entry_bar    integer,
  exit_bar     integer,
  outcome      text,
  pnl_pips     numeric,
  rr_achieved  numeric,
  bias_checked jsonb,
  created_at   timestamptz default now()
);

alter table public.trades enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'trades' and policyname = 'Users can view own trades'
  ) then
    create policy "Users can view own trades"
      on public.trades for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'trades' and policyname = 'Users can insert own trades'
  ) then
    create policy "Users can insert own trades"
      on public.trades for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- ── user_stats ───────────────────────────────────────────────
create table if not exists public.user_stats (
  user_id         uuid references public.profiles(id) primary key,
  total_sessions  integer default 0,
  total_trades    integer default 0,
  wins            integer default 0,
  losses          integer default 0,
  breakevens      integer default 0,
  total_pips      numeric default 0,
  best_streak     integer default 0,
  current_streak  integer default 0,
  updated_at      timestamptz default now()
);

alter table public.user_stats enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_stats' and policyname = 'Users can view own stats'
  ) then
    create policy "Users can view own stats"
      on public.user_stats for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_stats' and policyname = 'Users can upsert own stats'
  ) then
    create policy "Users can upsert own stats"
      on public.user_stats for all using (auth.uid() = user_id);
  end if;
end $$;

-- stats trigger
create or replace function public.update_user_stats()
returns trigger language plpgsql security definer as $$
declare
  v_wins integer; v_losses integer; v_breakevens integer;
  v_total_pips numeric; v_total_trades integer;
  v_current_streak integer := 0; v_best_streak integer := 0; v_streak integer := 0;
  t record;
begin
  select
    count(*) filter (where outcome = 'win'),
    count(*) filter (where outcome = 'loss'),
    count(*) filter (where outcome = 'breakeven'),
    coalesce(sum(pnl_pips), 0),
    count(*)
  into v_wins, v_losses, v_breakevens, v_total_pips, v_total_trades
  from public.trades where user_id = new.user_id;

  for t in
    select outcome from public.trades
    where user_id = new.user_id order by created_at desc
  loop
    if t.outcome = 'win' then
      v_streak := v_streak + 1;
      if v_streak > v_best_streak then v_best_streak := v_streak; end if;
      if v_current_streak = 0 then v_current_streak := v_streak; end if;
    else
      if v_current_streak = 0 then v_current_streak := v_streak; end if;
      v_streak := 0;
    end if;
  end loop;

  insert into public.user_stats
    (user_id, total_trades, wins, losses, breakevens, total_pips, best_streak, current_streak, updated_at)
  values
    (new.user_id, v_total_trades, v_wins, v_losses, v_breakevens, v_total_pips, v_best_streak, v_current_streak, now())
  on conflict (user_id) do update set
    total_trades   = excluded.total_trades,
    wins           = excluded.wins,
    losses         = excluded.losses,
    breakevens     = excluded.breakevens,
    total_pips     = excluded.total_pips,
    best_streak    = excluded.best_streak,
    current_streak = excluded.current_streak,
    updated_at     = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists on_trade_insert on public.trades;
create trigger on_trade_insert
  after insert on public.trades
  for each row execute function public.update_user_stats();

-- ── user_preferences ─────────────────────────────────────────
create table if not exists public.user_preferences (
  user_id          uuid references public.profiles(id) primary key,
  market           text        not null default 'Futures',
  session          text        not null default 'New York',
  account_size     integer     not null default 100000,
  bias_items       text[]      not null default '{}',
  max_risk         numeric     not null default 500,
  target_rr        numeric     not null default 2.0,
  created_at       timestamptz          default now(),
  updated_at       timestamptz          default now()
);

alter table public.user_preferences enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_preferences' and policyname = 'Users can view own preferences'
  ) then
    create policy "Users can view own preferences"
      on public.user_preferences for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_preferences' and policyname = 'Users can insert own preferences'
  ) then
    create policy "Users can insert own preferences"
      on public.user_preferences for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_preferences' and policyname = 'Users can update own preferences'
  ) then
    create policy "Users can update own preferences"
      on public.user_preferences for update using (auth.uid() = user_id);
  end if;
end $$;

-- ── backfill existing auth users into profiles ───────────────
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
