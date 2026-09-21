# AX V3 storefront

A separate Next.js menswear storefront for AX Men’s Store. Shopify remains the commerce engine. Normal checkout stays Shopify-hosted; optional server-side integrations are feature-gated and disabled until configured.

## Design

- Warm off-white canvas, refined serif headings, restrained navigation and generous spacing.
- The supplied AX logo is preserved; CSS frames its existing white margins.
- Full wardrobe navigation: T-shirts, shirts, trousers, denim, outerwear, formal and accessories.
- New arrivals, category directory, style edits, subtle Ask AX and Coimbatore community section.
- Product grids switch between 4 and 8 columns on desktop, 2 and 4 on mobile. Wide view hides names/prices while links retain accessible labels.
- Floating Home / Explore / AX Stylist / Search / Profile island, safe-area spacing, native modal dialogs and reduced-motion support.
- Shopify CDN responsive images, lazy loading, system fonts and a dynamically loaded Stylist panel.

## Commerce boundary

`lib/shopify.js` is server-only. Product and collection reads cache for 60 seconds. Cart requests are uncached and normal prepaid checkout uses Shopify's returned checkout URL. The optional Partial COD flow is a separate feature-gated AX checkout path that verifies a Razorpay advance, creates a partially-paid Shopify order and books the remaining balance as Delhivery COD.

Without credentials, the preview displays the supplied sample catalog, labels it clearly, and disables checkout. With credentials, failed requests surface errors; they never substitute sample products or a demo cart. The `Partial Payment` helper product is excluded from listings, collections and detail pages.

Live product sizes, colors, availability and prices come from Shopify variants. The bag supports add, quantity updates and removal. When a cart-session secret is configured, Shopify cart IDs are also bound to a signed HttpOnly AX browser cookie, so a copied cart ID alone cannot be read or mutated through AX APIs. The Profile panel uses the headless Shopify Customer Account API when configured, with a Shopify-hosted account fallback during setup.

AX Stylist uses a configuration-gated Luna/Terra Responses backend with central routing, bounded context, silent fallback and private usage analytics, read-only live Shopify tools, approved-chart fit guidance, optional photo input, explicit consent, private browser-linked profiles, deletion, moderation and shared usage limits. It is **disabled by default** and requires OpenAI/Supabase credentials plus a reviewed SQL migration and purge schedule before activation. No cloud database or API project is provisioned by the code. See [AX Stylist setup](docs/AX-STYLIST-SETUP.md), [product data](docs/PRODUCT-DATA.md), and [live evaluation cases](docs/AX-STYLIST-EVALS.md).

## Development

Use Node.js 22 or newer (verified on Node.js 24.19.0).

```sh
npm ci
npm test
npm run build
node scripts/smoke.mjs
npm run dev
```

Next.js 16.3.5 and React 19.3.0 are pinned; the lockfile is committed. `npm run start` serves the production build.

Set values from `.env.example` privately in your hosting environment before building. Local development can use an ignored `.env.local`. Never commit tokens or prefix private credentials with `NEXT_PUBLIC_`.

## Restock alert ownership

Back-in-stock requests remain inactive until the supplied email address is confirmed. AX stores only a server-HMAC of the one-time confirmation token, the confirmation link expires after 24 hours, and only confirmed rows enter the scheduled restock processor. This prevents someone who merely knows another person's email address from activating alerts for them.

## Error tracking

The storefront reports unhandled Next.js request failures and React error-boundary failures to Sentry when `SENTRY_DSN` is configured. Client failures are relayed through the same-origin, rate-limited `/api/errors/client` endpoint so the DSN does not need to be exposed in browser configuration. Reports include the error name/message, stack, route path, environment and optional release identifier; request bodies, query strings, account tokens and customer form data are not attached.

Set `SENTRY_DSN`, `AX_ERROR_ENVIRONMENT` and optionally `AX_ERROR_RELEASE` in Hostinger. Create alert rules in Sentry for new production issues and error-volume spikes.

## Deployment and remaining work

See [Hostinger staging](docs/HOSTINGER-STAGING.md), [live shipping rates](docs/SHIPPING-RATES.md), [Partial COD](docs/PARTIAL-COD.md), [customer account setup](docs/CUSTOMER-ACCOUNT-SETUP.md) and [verification](docs/VERIFICATION.md).

The current catalog/collection queries read up to 100 products; each PDP reads up to 100 variants and 8 images. Add pagination before the catalog exceeds these limits. Style edits depend on actual product titles, descriptions and tags; sparse categories remain empty until the catalog is enriched. Instagram is optional through the verified `AX_INSTAGRAM_URL` setting.

Next: configure the AI and private database on staging, enter real product guides, complete live-model/security and mobile checks, and verify the existing checkout. Do not enable public AI styling until those checks pass.
