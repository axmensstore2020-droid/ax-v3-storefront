# AX Stylist verification — 15 September 2026

Implemented on top of the source tree from main commit `71e9f9dff74d18bcbca929f992f31fb1c3f57c06`. The local starting tree matched that remote tree; existing product, navigation, editorial and commerce changes were preserved.

## Completed locally

- 62 automated checks: existing commerce/content tests plus deterministic fit, profile/input validation, signed/session-bound histories, image restrictions, tool allowlisting, moderation handling, output grounding and request limits.
- Route integration checks with simulated OpenAI/Supabase responses: CSRF/consent rejection before provider access; shared quota before AI calls; anonymous profile save/read/delete; secret-like text excluded from subsequent history; profile deletion with AI disabled.
- Next.js production build passes.
- HTTP route smoke checks across the storefront and disabled Stylist routes.
- GraphQL operations pass the Shopify skill's **bundled 2026-04 schema**. This is offline schema validation, not live 2026-07 API execution. Confirm target-version access/scopes in staging.
- The validator initially required a code-transmitting telemetry call and was blocked. Its source was inspected, then its documented `OPT_OUT_INSTRUMENTATION=true` mode was used. Validation used the bundled schema without sending project code externally.
- Configuration preflight correctly reports missing credentials in this workspace. It never prints key values.

## Not yet verified / owner setup required

- No OpenAI, Supabase or Shopify live credentials are configured in this execution environment. Existing Hostinger secrets are separate and have not been read or changed.
- No Supabase project was provisioned. The SQL migration and daily purge job have not been executed against a database. Real RLS, RPC concurrency and retention must be tested after setup.
- No live model calls, real usage/cost benchmarks, multilingual-quality evaluations or photo-quality/safety evaluations were run. Unit tests simulate provider responses and cannot certify real model behavior.
- The browser could not open the local preview (`ERR_BLOCKED_BY_CLIENT`). No visual, interactive mobile or Android image-picker pass is claimed. Complete these on the deployed staging branch.
- No Shopify products, policies, orders, customer data or product-field definitions were changed by this implementation. The merchant must enter verified data and review disclosures.
- AI and images remain disabled by default. No production enablement is part of this change.

Follow [the setup guide](AX-STYLIST-SETUP.md), then run [the live evaluation checklist](AX-STYLIST-EVALS.md) and record results before public activation.

## Two-tier and variant update — 15–16 September 2026

This update starts from main `5e81dd75fbfc555ae9d4f81f8fdf6af48e9dd67d`. The earlier “not yet verified” section above describes the original release; the database findings below supersede it.

- 77 tests pass, including the existing suite, routing, simple photo handling, silent escalation, advanced cap denial, provider fallback, response caps, usage privacy, bounded context and real-variant image/selection/cart mapping.
- Product/cart GraphQL operations pass the Shopify bundled schema validator with instrumentation opted out.
- Production Next.js build and storefront HTTP smoke checks pass. No standalone lint/type script is configured; the build completes Next.js's available type check.
- Connected Supabase `vfhhstewkefqopcgxrki`: existing profile and quota tables confirmed. Applied migration `20260915235149_ax_stylist_usage_and_model_budget`; verified new table RLS, denied anon/authenticated grants and server-only RPC access.
- Tested the advanced limiter at zero, one successful reservation and cap exhaustion, plus expired-usage purge, under service_role in a transaction that was rolled back. No test usage/limits remain.
- Existing `ax-stylist-cleanup` Cron job is active at `0 3 * * *` and calls the extended purge function. No duplicate job created.
- Supabase security advisor reports only informational [RLS enabled with no policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) findings on the three deliberately server-only tables. No public policies are intended; table/function grants were verified independently.
- Live Shopify read: inspected polo, PU jacket and checked shirt have assigned colour images but no Size option. The user must enter real size variants/stock. No Shopify mutations performed.
- OpenAI model IDs/reasoning and explicit prompt-caching request format checked against current official model/API documentation. All actual model calls in automated tests are simulated. No paid OpenAI benchmark or live photo-quality evaluation is claimed.
- Browser preview attempt failed with `ERR_BLOCKED_BY_CLIENT`; no visual Android/browser-interaction pass is claimed. Unit tests exercise the shared variant logic and HTTP smoke checks exercise rendering.
- Hostinger configuration/deployment has not been accessed. Existing credentials were not read or replaced. Complete the documented staged live checks after redeployment; do not confuse a successful GitHub push with a verified Hostinger release.
