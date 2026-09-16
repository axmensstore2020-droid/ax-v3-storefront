-- Private AX Stylist telemetry. No prompts, replies, photos or profile data.
create table public.ax_stylist_usage (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  session_id text not null check (session_id ~ '^[a-f0-9]{64}$'),
  conversation_id text not null check (conversation_id ~ '^[a-f0-9]{64}$'),
  event text not null check (event in ('response','turn')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  model text check (length(model) <= 100),
  tier text check (tier in ('luna','terra')),
  intent text not null check (intent in ('conversation','off_topic','store_help','fit','comparison','photo_styling','styling','catalog')),
  reasoning_effort text check (reasoning_effort in ('none','low','medium')),
  escalated boolean not null default false,
  escalation_reason text not null check (escalation_reason in ('none','multi_piece_outfit','multi_constraint_styling','complex_fit','detailed_photo','low_confidence','advanced_limit')),
  fallback boolean not null default false,
  input_tokens integer check (input_tokens >= 0),
  cached_input_tokens integer check (cached_input_tokens >= 0),
  cache_write_tokens integer check (cache_write_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  latency_ms integer not null check (latency_ms >= 0),
  success boolean not null,
  error_code text check (error_code in ('provider','incomplete','catalog','request','quota'))
);
create index ax_stylist_usage_created on public.ax_stylist_usage(created_at);
create index ax_stylist_usage_expiry on public.ax_stylist_usage(expires_at);
create index ax_stylist_usage_conversation on public.ax_stylist_usage(conversation_id);
alter table public.ax_stylist_usage enable row level security;
revoke all on public.ax_stylist_usage from public, anon, authenticated;
grant select, insert, delete on public.ax_stylist_usage to service_role;
comment on table public.ax_stylist_usage is 'Server-only pseudonymous AX Stylist response and turn metrics, retained for 30 days. Never store customer content.';

-- Reserves one advanced turn, not an extra model classification call. All
-- instances share this hard daily cap; failed calls still consume a reservation.
create or replace function public.ax_stylist_reserve_advanced(p_day_limit integer default 15)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  day_bucket text := 'advanced:' || to_char(now() at time zone 'UTC','YYYY-MM-DD');
  used integer;
begin
  if p_day_limit is null or p_day_limit not between 0 and 1000 then
    raise exception 'Invalid advanced limiter settings';
  end if;
  if p_day_limit = 0 then return false; end if;
  perform pg_advisory_xact_lock(6723194401);
  select requests into used from public.ax_stylist_limits where bucket=day_bucket;
  if coalesce(used,0) >= p_day_limit then return false; end if;
  insert into public.ax_stylist_limits(bucket,requests,expires_at)
    values(day_bucket,1,now()+interval '2 days')
    on conflict(bucket) do update set requests=public.ax_stylist_limits.requests+1;
  return true;
end;
$$;
revoke all on function public.ax_stylist_reserve_advanced(integer) from public, anon, authenticated;
grant execute on function public.ax_stylist_reserve_advanced(integer) to service_role;

-- Existing ax-stylist-cleanup Cron job continues to call this same function.
create or replace function public.ax_stylist_purge_expired()
returns void language sql security definer set search_path = '' as $$
  delete from public.ax_stylist_profiles where expires_at < now();
  delete from public.ax_stylist_limits where expires_at < now();
  delete from public.ax_stylist_usage where expires_at < now();
$$;
revoke all on function public.ax_stylist_purge_expired() from public, anon, authenticated;
grant execute on function public.ax_stylist_purge_expired() to service_role;
