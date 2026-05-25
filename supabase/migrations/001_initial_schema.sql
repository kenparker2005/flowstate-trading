-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users primary key,
  email text,
  is_subscribed boolean default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Forex pairs
create table public.pairs (
  id serial primary key,
  symbol text not null,
  display_name text,
  is_active boolean default true
);

alter table public.pairs enable row level security;

create policy "Anyone can read pairs"
  on public.pairs for select
  using (true);

-- Seed pairs
insert into public.pairs (symbol, display_name) values
  ('EURUSD', 'EUR/USD'),
  ('GBPUSD', 'GBP/USD'),
  ('USDJPY', 'USD/JPY'),
  ('USDCHF', 'USD/CHF'),
  ('AUDUSD', 'AUD/USD');

-- Sessions
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  pair_id integer references public.pairs(id),
  timeframe text,
  session_date date,
  started_at timestamptz default now(),
  ended_at timestamptz,
  status text default 'active'
);

alter table public.sessions enable row level security;

create policy "Users can view own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.sessions for update
  using (auth.uid() = user_id);

-- Trades
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id),
  user_id uuid references public.profiles(id),
  direction text,
  entry_price numeric,
  exit_price numeric,
  stop_loss numeric,
  take_profit numeric,
  entry_bar integer,
  exit_bar integer,
  outcome text,
  pnl_pips numeric,
  rr_achieved numeric,
  created_at timestamptz default now()
);

alter table public.trades enable row level security;

create policy "Users can view own trades"
  on public.trades for select
  using (auth.uid() = user_id);

create policy "Users can insert own trades"
  on public.trades for insert
  with check (auth.uid() = user_id);

-- User stats
create table public.user_stats (
  user_id uuid references public.profiles(id) primary key,
  total_sessions integer default 0,
  total_trades integer default 0,
  wins integer default 0,
  losses integer default 0,
  breakevens integer default 0,
  total_pips numeric default 0,
  best_streak integer default 0,
  current_streak integer default 0,
  updated_at timestamptz default now()
);

alter table public.user_stats enable row level security;

create policy "Users can view own stats"
  on public.user_stats for select
  using (auth.uid() = user_id);

create policy "Users can upsert own stats"
  on public.user_stats for all
  using (auth.uid() = user_id);

-- Function to update user stats after trade insert
create or replace function public.update_user_stats()
returns trigger language plpgsql security definer as $$
declare
  v_wins integer;
  v_losses integer;
  v_breakevens integer;
  v_total_pips numeric;
  v_total_trades integer;
  v_current_streak integer := 0;
  v_best_streak integer := 0;
  v_streak integer := 0;
  t record;
begin
  select count(*) filter (where outcome = 'win'),
         count(*) filter (where outcome = 'loss'),
         count(*) filter (where outcome = 'breakeven'),
         coalesce(sum(pnl_pips), 0),
         count(*)
  into v_wins, v_losses, v_breakevens, v_total_pips, v_total_trades
  from public.trades
  where user_id = new.user_id;

  for t in
    select outcome from public.trades
    where user_id = new.user_id
    order by created_at desc
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

  insert into public.user_stats (user_id, total_trades, wins, losses, breakevens, total_pips, best_streak, current_streak, updated_at)
  values (new.user_id, v_total_trades, v_wins, v_losses, v_breakevens, v_total_pips, v_best_streak, v_current_streak, now())
  on conflict (user_id) do update set
    total_trades = excluded.total_trades,
    wins = excluded.wins,
    losses = excluded.losses,
    breakevens = excluded.breakevens,
    total_pips = excluded.total_pips,
    best_streak = excluded.best_streak,
    current_streak = excluded.current_streak,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

create trigger on_trade_insert
  after insert on public.trades
  for each row execute function public.update_user_stats();
