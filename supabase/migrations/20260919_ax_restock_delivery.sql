-- Restock delivery bookkeeping for safe retries and provider observability.
begin;
alter table public.ax_restock_subscriptions
  add column if not exists attempt_count integer not null default 0 check (attempt_count between 0 and 1000),
  add column if not exists last_attempt_at timestamptz,
  add column if not exists last_error text not null default '' check (octet_length(last_error) <= 500),
  add column if not exists provider_message_id text not null default '' check (octet_length(provider_message_id) <= 128);
create index if not exists ax_restock_retry_idx
  on public.ax_restock_subscriptions(status,attempt_count,updated_at)
  where status='pending';
commit;
