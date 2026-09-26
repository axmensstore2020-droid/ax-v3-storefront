-- Extend the existing anonymous event table with launch-funnel telemetry.
-- Stores no customer content, IP address, user agent, referrer, email, or phone.
begin;

alter table public.ax_store_events
  drop constraint if exists ax_store_events_event_name_check;

alter table public.ax_store_events
  add constraint ax_store_events_event_name_check check (event_name in (
    'product_view','search','filter','select_variant','size_guide','shipping_quote',
    'recommendation_click','add_to_cart','add_look','begin_checkout','web_vital',
    'launch_visit','launch_playroom_open','launch_game_start','launch_round_complete',
    'launch_match_complete','launch_match_win','launch_reward_issued','launch_calendar_click'
  ));

commit;
