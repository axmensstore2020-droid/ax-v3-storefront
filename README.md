# AX V3 storefront

A separate Next.js menswear storefront for AX Men’s Store. Shopify remains the commerce engine. This repository does not modify Shopify Admin, inventory, orders, Razorpay, Delhivery, or the existing live website.

## Design

- Warm off-white canvas, refined serif headings, restrained navigation and generous spacing.
- The supplied AX logo is preserved; CSS frames its existing white margins.
- Full wardrobe navigation: T-shirts, shirts, trousers, denim, outerwear, formal and accessories.
- New arrivals, category directory, style edits, subtle Ask AX and Coimbatore community section.
- Product grids switch between 4 and 8 columns on desktop, 2 and 4 on mobile. Wide view hides names/prices while links retain accessible labels.
- Floating Home / Explore / AX Stylist / Search / Profile island, safe-area spacing, native modal dialogs and reduced-motion support.
- Shopify CDN responsive images, lazy loading, system fonts and a dynamically loaded Stylist panel.

## Commerce boundary

`lib/shopify.js` is server-only. Product and collection reads cache for 60 seconds. Cart requests are uncached and use Shopify's returned checkout URL. No payment or shipping integrations are rebuilt.

Without credentials, the preview displays the supplied sample catalog, labels it clearly, and disables checkout. With credentials, failed requests surface errors; they never substitute sample products or a demo cart. The `Partial Payment` helper product is excluded from listings, collections and detail pages.

Live product sizes, colors, availability and prices come from Shopify variants. The bag supports add, quantity updates and removal. Native account access is linked only for a configured store.

The Stylist currently provides working catalog/style navigation and product search. Conversational AI, photo matching, personalized sizing, saved preferences and outfit recommendations are **not connected**. No customer measurement database has been created.

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

## Deployment and remaining work

See [Hostinger staging](docs/HOSTINGER-STAGING.md) and [verification](docs/VERIFICATION.md).

The current catalog/collection queries read up to 100 products; each PDP reads up to 100 variants and 8 images. Add pagination before the catalog exceeds these limits. Style edits depend on actual product titles, descriptions and tags; sparse categories remain empty until the catalog is enriched. Instagram is optional through the verified `AX_INSTAGRAM_URL` setting.

Next: staging visual review, private Shopify configuration, real cart/checkout verification, finalized product photography and exchange-policy copy. Then implement the catalog-grounded AI and customer data layer.
