create table public.user_preferences (
  user_id          uuid references public.profiles(id) primary key,
  market           text        not null default 'ES',
  session          text        not null default 'New York',
  account_size     integer     not null default 100000,
  bias_items       text[]      not null default '{}',
  max_risk         numeric     not null default 500,
  target_rr        numeric     not null default 2.0,
  created_at       timestamptz          default now(),
  updated_at       timestamptz          default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can view own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id);
