-- Anonymous, consent-gated storefront funnel events. No customer content or PII.
begin;
create table if not exists public.ax_store_events (
  id bigint generated always as identity primary key,
  visitor_hash text not null check (visitor_hash ~ '^[a-f0-9]{64}$'),
  event_name text not null check (event_name in (
    'search','filter','select_variant','size_guide','shipping_quote',
    'recommendation_click','add_look','begin_checkout','web_vital'
  )),
  path text not null default '' check (octet_length(path) <= 512),
  product_handle text not null default '' check (octet_length(product_handle) <= 160),
  value numeric(12,2) check (value is null or (value >= 0 and value < 10000000)),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists ax_store_events_created_at_idx on public.ax_store_events(created_at desc);
create index if not exists ax_store_events_name_created_idx on public.ax_store_events(event_name,created_at desc);
create index if not exists ax_store_events_product_created_idx on public.ax_store_events(product_handle,created_at desc) where product_handle <> '';
alter table public.ax_store_events enable row level security;
revoke all on public.ax_store_events from public, anon, authenticated;
grant select, insert, delete on public.ax_store_events to service_role;
commit;
