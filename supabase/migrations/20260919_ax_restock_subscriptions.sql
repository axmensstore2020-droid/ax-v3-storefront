-- Server-only restock alert requests. Email is retained solely to deliver the requested transactional alert.
begin;
create table if not exists public.ax_restock_subscriptions (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  email text not null check (octet_length(email) between 3 and 254 and email = lower(email)),
  product_handle text not null check (product_handle ~ '^[a-z0-9][a-z0-9-]{0,127}$'),
  variant_id text not null check (variant_id ~ '^gid://shopify/ProductVariant/[0-9]+$'),
  variant_label text not null default '' check (octet_length(variant_label) <= 240),
  status text not null default 'pending' check (status in ('pending','notified','cancelled','expired')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notified_at timestamptz,
  expires_at timestamptz not null default (now() + interval '180 days')
);
create index if not exists ax_restock_pending_idx on public.ax_restock_subscriptions(status,expires_at,updated_at);
create index if not exists ax_restock_variant_idx on public.ax_restock_subscriptions(product_handle,variant_id) where status='pending';
alter table public.ax_restock_subscriptions enable row level security;
revoke all on public.ax_restock_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.ax_restock_subscriptions to service_role;
commit;
