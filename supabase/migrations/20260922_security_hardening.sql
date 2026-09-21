-- Security hardening: explicit deny policies, WhatsApp consent storage, and shared provider budgets.
-- Browser roles stay locked out; only the server-side service role can access these tables/RPCs.
begin;

create table if not exists public.ax_whatsapp_preferences (
  customer_hash text primary key check (customer_hash ~ '^[a-f0-9]{64}$'),
  phone_e164 text not null default '' check (octet_length(phone_e164) <= 18),
  opted_in boolean not null default false,
  source text not null default 'account' check (octet_length(source) <= 32),
  consent_version text not null default 'v1' check (octet_length(consent_version) <= 16),
  consent_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists ax_whatsapp_preferences_opted_in_idx
  on public.ax_whatsapp_preferences(opted_in,updated_at desc);

alter table public.ax_stylist_profiles enable row level security;
alter table public.ax_stylist_limits enable row level security;
alter table public.ax_stylist_usage enable row level security;
alter table public.ax_store_events enable row level security;
alter table public.ax_restock_subscriptions enable row level security;
alter table public.ax_whatsapp_preferences enable row level security;

revoke all on public.ax_stylist_profiles, public.ax_stylist_limits, public.ax_stylist_usage,
  public.ax_store_events, public.ax_restock_subscriptions, public.ax_whatsapp_preferences
  from public, anon, authenticated;

grant select, insert, update, delete on public.ax_stylist_profiles, public.ax_stylist_limits to service_role;
grant select, insert, delete on public.ax_stylist_usage, public.ax_store_events to service_role;
grant select, insert, update, delete on public.ax_restock_subscriptions, public.ax_whatsapp_preferences to service_role;

drop policy if exists deny_direct_client_access on public.ax_stylist_profiles;
create policy deny_direct_client_access on public.ax_stylist_profiles
  for all to anon, authenticated using (false) with check (false);
drop policy if exists deny_direct_client_access on public.ax_stylist_limits;
create policy deny_direct_client_access on public.ax_stylist_limits
  for all to anon, authenticated using (false) with check (false);
drop policy if exists deny_direct_client_access on public.ax_stylist_usage;
create policy deny_direct_client_access on public.ax_stylist_usage
  for all to anon, authenticated using (false) with check (false);
drop policy if exists deny_direct_client_access on public.ax_store_events;
create policy deny_direct_client_access on public.ax_store_events
  for all to anon, authenticated using (false) with check (false);
drop policy if exists deny_direct_client_access on public.ax_restock_subscriptions;
create policy deny_direct_client_access on public.ax_restock_subscriptions
  for all to anon, authenticated using (false) with check (false);
drop policy if exists deny_direct_client_access on public.ax_whatsapp_preferences;
create policy deny_direct_client_access on public.ax_whatsapp_preferences
  for all to anon, authenticated using (false) with check (false);

create or replace function public.ax_server_budget_reserve(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer default 86400
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_window integer := greatest(60,least(coalesce(p_window_seconds,86400),86400));
  safe_limit integer := greatest(1,least(coalesce(p_limit,1),100000));
  slot bigint := floor(extract(epoch from now()) / safe_window);
  key text;
  reserved integer;
begin
  if p_bucket is null or p_bucket !~ '^[a-z0-9:_-]{1,64}$' then
    return false;
  end if;
  key := 'budget:' || p_bucket || ':' || slot::text;

  insert into public.ax_stylist_limits(bucket,requests,expires_at)
  values(key,1,to_timestamp((slot + 1) * safe_window))
  on conflict(bucket) do update
    set requests = public.ax_stylist_limits.requests + 1,
        expires_at = excluded.expires_at
    where public.ax_stylist_limits.requests < safe_limit
  returning requests into reserved;

  return reserved is not null;
end;
$$;

revoke all on function public.ax_server_budget_reserve(text,integer,integer) from public, anon, authenticated;
grant execute on function public.ax_server_budget_reserve(text,integer,integer) to service_role;

commit;
