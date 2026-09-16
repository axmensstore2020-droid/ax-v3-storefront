# AX V3 launch security checklist

## Already enforced in code

- HTTPS-only production origin validation for customer-facing POST endpoints.
- Same-origin protection for AX Stylist, profile saves/deletes, and cart mutations.
- Bounded JSON request bodies and strict content-type checks.
- Cart burst limiting with a trusted-IP key when an approved proxy header is configured, otherwise an anonymous browser guard.
- AX Stylist usage limits and daily model budgets.
- Image type, signature and byte-size validation before photo styling.
- Signed Stylist conversation/session state and encrypted Shopify Customer Account tokens.
- HttpOnly/Secure/SameSite cookies in production.
- No-store headers for account/API responses.
- Site-wide CSP, anti-clickjacking, HSTS, MIME sniffing protection, referrer policy and browser permissions restrictions.
- Supabase RLS with no anon/authenticated access to AX Stylist profile/usage tables.
- 30-day Stylist profile expiry; chats and uploaded photos are not persisted in the AX Stylist database.
- GitHub CI for tests, production build, npm high-severity audit, and accidental .env commit detection.
- Dependabot for npm and GitHub Actions.

## Production settings to verify in Hostinger

1. `AX_SITE_ORIGIN` must be exactly the public HTTPS origin, for example `https://axstore.in` with no trailing slash.
2. Keep every credential server-only. Never create `NEXT_PUBLIC_` versions of OpenAI, Supabase, Shopify Customer Account, Delhivery, or session secrets.
3. Use fresh production values for `SHOPIFY_CUSTOMER_ACCOUNT_SESSION_SECRET` and `AX_STYLIST_SECRET` (32+ random characters) rather than staging/test values.
4. Set `SHOPIFY_BUYER_IP_HEADER` and `AX_STYLIST_IP_HEADER` only if Hostinger confirms the named header is overwritten by its trusted proxy. Otherwise leave them blank.
5. Keep `AX_ALLOW_INDEXING=false` until the production domain, checkout, account and policies are fully verified.
6. Enable Hostinger HTTPS redirect and its available WAF/DDoS/bot protection. Apply an edge rate limit to `/api/cart` and `/api/stylist` if Hostinger exposes path-based rules.
7. Keep database and API backups/recovery information in the service dashboards, not in this repository.

## GitHub settings to verify

1. Change `axmensstore2020-droid/ax-v3-storefront` to **Private** when public source access is no longer needed.
2. Protect `main`: require a pull request and require the **Security & Build / verify** check before merging.
3. Keep force-push and branch deletion disabled on `main`.
4. Enable GitHub secret scanning/push protection if the account plan exposes it for this private repository.
5. Require 2FA/passkeys on the GitHub account and remove unused personal access tokens or collaborators.

## Payment and customer-data boundary

AX servers must never collect or store card numbers, CVVs, UPI PINs, banking credentials or Razorpay secrets in the browser. Payment entry remains on Shopify/Razorpay-hosted checkout. Only collect customer fit/style data that the Stylist needs, keep the current deletion control, and do not add photo persistence without a separate retention/privacy review.

## Secret rotation procedure

Rotate one integration at a time: create the new secret in the provider, update the Hostinger server variable, deploy and smoke-test, then revoke the old secret. Never commit a live secret to Git, screenshots, issues, PR comments or chat.
