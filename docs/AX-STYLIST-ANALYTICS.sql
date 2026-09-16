-- Run privately as an owner in Supabase SQL Editor. No public dashboard/view.
-- Response-call share (includes silent drafts, tool rounds and provider failures).
select tier, model, count(*) as calls,
  round(100.0*count(*)/sum(count(*)) over (),2) as call_percentage,
  sum(input_tokens) as input_tokens, sum(cached_input_tokens) as cached_input_tokens,
  sum(cache_write_tokens) as cache_write_tokens, sum(output_tokens) as output_tokens,
  round(avg(latency_ms)) as average_latency_ms,
  count(*) filter(where not success) as failures,
  count(*) filter(where input_tokens is null or output_tokens is null) as calls_with_unknown_usage
from public.ax_stylist_usage where event='response' and created_at>=now()-interval '7 days'
group by tier,model;

-- Turn metrics: one row per accepted customer message, including local redirects.
select intent, count(*) as customer_messages,
  count(distinct session_id) as anonymous_browsers,
  count(distinct conversation_id) as conversations,
  round(count(*)::numeric/nullif(count(distinct session_id),0),2) as messages_per_browser,
  round(100.0*count(*) filter(where escalated)/nullif(count(*),0),2) as escalation_percentage,
  count(*) filter(where fallback) as fallbacks,
  count(*) filter(where escalation_reason='advanced_limit') as advanced_cap_denials,
  round(avg(latency_ms)) as average_turn_latency_ms
from public.ax_stylist_usage where event='turn' and created_at>=now()-interval '7 days'
group by intent;

-- Cost estimate. Replace NULLs with current verified USD / million-token rates.
-- Fill separate cache-write rates when those tokens have a different rate.
-- If a model is changed, update this table to include its actual recorded ID.
-- Provider billing remains authoritative, especially for failed/unknown usage.
with rates(model,input_rate,cached_rate,cache_write_rate,output_rate) as (
  values ('gpt-5.6-luna',null::numeric,null::numeric,null::numeric,null::numeric),
         ('gpt-5.6-terra',null::numeric,null::numeric,null::numeric,null::numeric)
), recent as (
  select * from public.ax_stylist_usage where created_at>=now()-interval '7 days'
), cost as (
  select u.conversation_id,
    case when u.input_tokens is not null and u.output_tokens is not null
      and r.input_rate is not null and r.cached_rate is not null
      and r.cache_write_rate is not null and r.output_rate is not null
    then (greatest(u.input_tokens-coalesce(u.cached_input_tokens,0)-coalesce(u.cache_write_tokens,0),0)*r.input_rate
      + coalesce(u.cached_input_tokens,0)*r.cached_rate
      + coalesce(u.cache_write_tokens,0)*r.cache_write_rate
      + u.output_tokens*r.output_rate)/1000000 end as usd
  from recent u left join rates r using(model) where u.event='response'
)
select count(*) as calls,
  count(*) filter(where usd is null) as unknown_cost_calls,
  case when count(*) filter(where usd is null)=0 then coalesce(sum(usd),0) end as estimated_total_usd,
  case when count(*) filter(where usd is null)=0 then coalesce(sum(usd),0) /
    nullif((select count(distinct conversation_id) from recent where event='turn'),0) end as estimated_usd_per_conversation
from cost;
