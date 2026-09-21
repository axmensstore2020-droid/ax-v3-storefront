begin;
alter table public.ax_restock_subscriptions
  add column if not exists verification_token_hash text not null default '',
  add column if not exists verification_expires_at timestamptz;

alter table public.ax_restock_subscriptions
  drop constraint if exists ax_restock_subscriptions_status_check;
alter table public.ax_restock_subscriptions
  add constraint ax_restock_subscriptions_status_check
  check (status in ('unverified','pending','notified','cancelled','expired'));

create unique index if not exists ax_restock_verification_token_idx
  on public.ax_restock_subscriptions(verification_token_hash)
  where verification_token_hash <> '';

update public.ax_restock_subscriptions
set status='pending'
where status not in ('pending','notified','cancelled','expired');

commit;
