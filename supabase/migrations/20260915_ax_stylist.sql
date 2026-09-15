-- Run once in a NEW or existing approved Supabase project, SQL Editor.
-- Contains no product/customer/order writes. No chat messages or photos stored.
begin;
create table if not exists public.ax_stylist_profiles (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  profile jsonb not null check (jsonb_typeof(profile) = 'object' and octet_length(profile::text) < 4000),
  consent_version text not null,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index if not exists ax_stylist_profiles_expiry on public.ax_stylist_profiles(expires_at);
create table if not exists public.ax_stylist_limits (
  bucket text primary key,
  requests integer not null default 0,
  expires_at timestamptz not null
);
create index if not exists ax_stylist_limits_expiry on public.ax_stylist_limits(expires_at);
alter table public.ax_stylist_profiles enable row level security;
alter table public.ax_stylist_limits enable row level security;
revoke all on public.ax_stylist_profiles, public.ax_stylist_limits from public, anon, authenticated;
grant select, insert, update, delete on public.ax_stylist_profiles, public.ax_stylist_limits to service_role;

create or replace function public.ax_stylist_reserve(
  p_visitor text, p_ip text default null, p_hour_limit integer default 12, p_day_limit integer default 150
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  day_bucket text := 'day:' || to_char(now() at time zone 'UTC', 'YYYY-MM-DD');
  hour_suffix text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD-HH24');
  visitor_bucket text;
  ip_bucket text;
  daily integer;
  hourly integer;
begin
  if p_visitor !~ '^[a-f0-9]{64}$' or (p_ip is not null and p_ip !~ '^[a-f0-9]{64}$')
    or p_hour_limit not between 1 and 100 or p_day_limit not between 1 and 10000 then
    raise exception 'Invalid limiter settings';
  end if;
  -- One lock serializes check+increment, including across server instances.
  perform pg_advisory_xact_lock(6723194401);
  delete from public.ax_stylist_limits where expires_at < now();
  delete from public.ax_stylist_profiles where expires_at < now();
  visitor_bucket := 'visitor:' || p_visitor || ':' || hour_suffix;
  ip_bucket := 'ip:' || coalesce(p_ip,'') || ':' || hour_suffix;
  select requests into daily from public.ax_stylist_limits where bucket = day_bucket;
  select requests into hourly from public.ax_stylist_limits where bucket = visitor_bucket;
  if coalesce(daily,0) >= p_day_limit or coalesce(hourly,0) >= p_hour_limit then return false; end if;
  if p_ip is not null then
    select requests into hourly from public.ax_stylist_limits where bucket = ip_bucket;
    if coalesce(hourly,0) >= p_hour_limit * 3 then return false; end if;
  end if;
  insert into public.ax_stylist_limits(bucket,requests,expires_at)
    values (day_bucket,1,now()+interval '2 days'), (visitor_bucket,1,now()+interval '2 hours')
    on conflict (bucket) do update set requests = public.ax_stylist_limits.requests + 1;
  if p_ip is not null then
    insert into public.ax_stylist_limits(bucket,requests,expires_at) values (ip_bucket,1,now()+interval '2 hours')
      on conflict (bucket) do update set requests = public.ax_stylist_limits.requests + 1;
  end if;
  return true;
end;
$$;
revoke all on function public.ax_stylist_reserve(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.ax_stylist_reserve(text,text,integer,integer) to service_role;

-- Schedule daily via Supabase Cron after enabling that extension; also cleaned
-- on accepted chat requests. No arbitrary network endpoints or cron extensions
-- are enabled by this migration.
create or replace function public.ax_stylist_purge_expired()
returns void language sql security definer set search_path = '' as $$
  delete from public.ax_stylist_profiles where expires_at < now();
  delete from public.ax_stylist_limits where expires_at < now();
$$;
revoke all on function public.ax_stylist_purge_expired() from public, anon, authenticated;
grant execute on function public.ax_stylist_purge_expired() to service_role;
commit;
