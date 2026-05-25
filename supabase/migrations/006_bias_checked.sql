-- Add bias_checked column to trades table.
-- Stores the checklist state at the moment the trade was entered.
-- Format: {"daily_trend": true, "4h_trend": false, ...}
alter table public.trades
  add column if not exists bias_checked jsonb;
