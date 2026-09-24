-- Rich AX Stylist quota reservations for customer messaging and one-shot merchant alerts.
-- Keeps the original boolean ax_stylist_reserve function for rollback compatibility.
begin;

create or replace function public.ax_stylist_reserve_v2(
  p_visitor text,
  p_ip text default null,
  p_hour_limit integer default 12,
  p_day_limit integer default 150,
  p_warning_percent integer default 80
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  day_suffix text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD');
  day_bucket text := 'day:' || day_suffix;
  hour_suffix text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD-HH24');
  visitor_bucket text;
  ip_bucket text;
  warning_bucket text := 'alert:stylist-warning:' || day_suffix;
  limit_bucket text := 'alert:stylist-limit:' || day_suffix;
  daily integer := 0;
  visitor_hourly integer := 0;
  ip_hourly integer := 0;
  daily_after integer;
  warning_at integer;
  alert_kind text := 'none';
  alert_key text := '';
begin
  if p_visitor !~ '^[a-f0-9]{64}$'
    or (p_ip is not null and p_ip !~ '^[a-f0-9]{64}$')
    or p_hour_limit not between 1 and 100
    or p_day_limit not between 1 and 10000
    or p_warning_percent not between 50 and 99 then
    raise exception 'Invalid limiter settings';
  end if;

  perform pg_advisory_xact_lock(6723194401);
  delete from public.ax_stylist_limits where expires_at < now();
  delete from public.ax_stylist_profiles where expires_at < now();

  visitor_bucket := 'visitor:' || p_visitor || ':' || hour_suffix;
  ip_bucket := 'ip:' || coalesce(p_ip,'') || ':' || hour_suffix;
  warning_at := greatest(1, ceil(p_day_limit * p_warning_percent / 100.0)::integer);

  select requests into daily from public.ax_stylist_limits where bucket = day_bucket;
  daily := coalesce(daily,0);

  if daily >= p_day_limit then
    if not exists(select 1 from public.ax_stylist_limits where bucket=limit_bucket) then
      insert into public.ax_stylist_limits(bucket,requests,expires_at)
      values(limit_bucket,1,now()+interval '2 days')
      on conflict(bucket) do nothing;
      if found then alert_kind := 'limit'; alert_key := limit_bucket; end if;
    end if;
    return jsonb_build_object(
      'allowed',false,'reason','daily','dailyUsed',daily,'dailyLimit',p_day_limit,
      'hourlyUsed',null,'hourlyLimit',p_hour_limit,'alert',alert_kind,'alertKey',alert_key
    );
  end if;

  select requests into visitor_hourly from public.ax_stylist_limits where bucket = visitor_bucket;
  visitor_hourly := coalesce(visitor_hourly,0);
  if visitor_hourly >= p_hour_limit then
    return jsonb_build_object(
      'allowed',false,'reason','visitor_hourly','dailyUsed',daily,'dailyLimit',p_day_limit,
      'hourlyUsed',visitor_hourly,'hourlyLimit',p_hour_limit,'alert','none','alertKey',''
    );
  end if;

  if p_ip is not null then
    select requests into ip_hourly from public.ax_stylist_limits where bucket = ip_bucket;
    ip_hourly := coalesce(ip_hourly,0);
    if ip_hourly >= p_hour_limit * 3 then
      return jsonb_build_object(
        'allowed',false,'reason','ip_hourly','dailyUsed',daily,'dailyLimit',p_day_limit,
        'hourlyUsed',ip_hourly,'hourlyLimit',p_hour_limit * 3,'alert','none','alertKey',''
      );
    end if;
  end if;

  insert into public.ax_stylist_limits(bucket,requests,expires_at)
  values (day_bucket,1,now()+interval '2 days'), (visitor_bucket,1,now()+interval '2 hours')
  on conflict (bucket) do update set requests = public.ax_stylist_limits.requests + 1;

  if p_ip is not null then
    insert into public.ax_stylist_limits(bucket,requests,expires_at)
    values (ip_bucket,1,now()+interval '2 hours')
    on conflict (bucket) do update set requests = public.ax_stylist_limits.requests + 1;
  end if;

  daily_after := daily + 1;
  visitor_hourly := visitor_hourly + 1;

  if daily_after >= p_day_limit then
    if not exists(select 1 from public.ax_stylist_limits where bucket=limit_bucket) then
      insert into public.ax_stylist_limits(bucket,requests,expires_at)
      values(limit_bucket,1,now()+interval '2 days')
      on conflict(bucket) do nothing;
      if found then alert_kind := 'limit'; alert_key := limit_bucket; end if;
    end if;
  elsif daily_after >= warning_at then
    if not exists(select 1 from public.ax_stylist_limits where bucket=warning_bucket) then
      insert into public.ax_stylist_limits(bucket,requests,expires_at)
      values(warning_bucket,1,now()+interval '2 days')
      on conflict(bucket) do nothing;
      if found then alert_kind := 'warning'; alert_key := warning_bucket; end if;
    end if;
  end if;

  return jsonb_build_object(
    'allowed',true,'reason','ok','dailyUsed',daily_after,'dailyLimit',p_day_limit,
    'hourlyUsed',visitor_hourly,'hourlyLimit',p_hour_limit,'alert',alert_kind,'alertKey',alert_key
  );
end;
$$;

revoke all on function public.ax_stylist_reserve_v2(text,text,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.ax_stylist_reserve_v2(text,text,integer,integer,integer) to service_role;

create or replace function public.ax_stylist_release_alert(p_alert_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted integer;
begin
  if p_alert_key !~ '^alert:stylist-(warning|limit):[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return false;
  end if;
  delete from public.ax_stylist_limits where bucket=p_alert_key;
  get diagnostics deleted = row_count;
  return deleted > 0;
end;
$$;

revoke all on function public.ax_stylist_release_alert(text) from public, anon, authenticated;
grant execute on function public.ax_stylist_release_alert(text) to service_role;

commit;
