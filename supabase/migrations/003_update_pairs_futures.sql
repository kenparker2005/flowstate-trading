-- Replace forex pairs with ES and NQ futures contracts
delete from public.pairs;

-- Reset serial so IDs start cleanly
alter sequence public.pairs_id_seq restart with 1;

insert into public.pairs (symbol, display_name) values
  ('ES', 'E-mini S&P 500'),
  ('NQ', 'E-mini Nasdaq-100');
