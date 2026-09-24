-- Supabase Data API grant hardening.
-- After October 30, new public-schema tables are not automatically reachable
-- through Supabase Data API/GraphQL without explicit grants.
--
-- AX keeps these tables server-only: browser roles stay revoked and denied by
-- RLS, while the server-side Supabase secret/service role keeps explicit access.
begin;

grant usage on schema public to service_role;

alter table if exists public.ax_stylist_profiles enable row level security;
alter table if exists public.ax_stylist_limits enable row level security;
alter table if exists public.ax_stylist_usage enable row level security;
alter table if exists public.ax_store_events enable row level security;
alter table if exists public.ax_restock_subscriptions enable row level security;
alter table if exists public.ax_whatsapp_preferences enable row level security;

revoke all on table
  public.ax_stylist_profiles,
  public.ax_stylist_limits,
  public.ax_stylist_usage,
  public.ax_store_events,
  public.ax_restock_subscriptions,
  public.ax_whatsapp_preferences
from public, anon, authenticated;

grant select, insert, update, delete
on table public.ax_stylist_profiles, public.ax_stylist_limits
to service_role;

grant select, insert, delete
on table public.ax_stylist_usage, public.ax_store_events
to service_role;

grant select, insert, update, delete
on table public.ax_restock_subscriptions, public.ax_whatsapp_preferences
to service_role;

-- ax_store_events uses a generated identity column. Keep direct browser access
-- revoked, but allow the server role to use the backing sequence when inserting
-- through the Data API.
revoke all on sequence public.ax_store_events_id_seq from public, anon, authenticated;
grant usage, select on sequence public.ax_store_events_id_seq to service_role;

revoke all on function public.ax_stylist_reserve(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.ax_stylist_reserve(text,text,integer,integer) to service_role;

revoke all on function public.ax_stylist_reserve_advanced(integer) from public, anon, authenticated;
grant execute on function public.ax_stylist_reserve_advanced(integer) to service_role;

revoke all on function public.ax_stylist_purge_expired() from public, anon, authenticated;
grant execute on function public.ax_stylist_purge_expired() to service_role;

revoke all on function public.ax_server_budget_reserve(text,integer,integer) from public, anon, authenticated;
grant execute on function public.ax_server_budget_reserve(text,integer,integer) to service_role;

revoke all on function public.ax_stylist_reserve_v2(text,text,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.ax_stylist_reserve_v2(text,text,integer,integer,integer) to service_role;

revoke all on function public.ax_stylist_release_alert(text) from public, anon, authenticated;
grant execute on function public.ax_stylist_release_alert(text) to service_role;

commit;
