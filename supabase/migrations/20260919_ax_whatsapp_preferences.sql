-- Explicit, revocable WhatsApp marketing preferences for signed-in AX customers.
-- PII is service-role only; no browser role receives direct table access.
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
create index if not exists ax_whatsapp_preferences_opted_in_idx on public.ax_whatsapp_preferences(opted_in,updated_at desc);
alter table public.ax_whatsapp_preferences enable row level security;
revoke all on public.ax_whatsapp_preferences from public, anon, authenticated;
grant select, insert, update, delete on public.ax_whatsapp_preferences to service_role;
commit;
