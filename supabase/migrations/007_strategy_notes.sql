-- Add strategy notes field to user_preferences for the Bias page
alter table public.user_preferences
  add column if not exists strategy_notes text not null default '';
