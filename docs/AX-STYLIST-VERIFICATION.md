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
