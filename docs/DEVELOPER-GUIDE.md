# AX V3 developer handoff guide

Give this document to a developer first when AX V3 has a bug or needs a feature change.

AX V3 is a Next.js storefront. Shopify is the source of truth for products, variants, inventory and normal checkout. Server-only integrations handle customer accounts, Delhivery, Partial COD, AX Stylist, analytics and error reporting.

## Safe workflow

Do not patch production directly.

1. Branch from main.
2. Reproduce the issue before changing code.
3. Make the smallest relevant change.
4. Run npm ci, npm test and npm run build.
5. Open a pull request.
6. Require Security & Build to pass.
7. Review the changed behavior on staging.
8. Squash-merge to main.
9. Verify the Hostinger deployment separately. A GitHub merge is not proof that production is healthy.

Never commit .env files, API keys, access tokens, payment data or customer data.

## Architecture

Customer browser
- Next.js pages and React components
- Shopify Storefront API: catalog, variants, stock, cart and normal checkout
- Shopify Customer Account API: sign-in, profile, addresses and orders
- AX API routes:
  - Delhivery
  - Razorpay -> Shopify Admin -> Delhivery for Partial COD
  - OpenAI + Supabase for AX Stylist
  - Meta Pixel / CAPI
  - Sentry
- Normal prepaid checkout remains Shopify-hosted

Important boundaries:
- Shopify variants, not measurement charts, define sellable sizes and colours.
- ax_data.measurements means garment measurements.
- ax_data.size_guide means approved body ranges used by AX Stylist.
- Normal prepaid checkout stays Shopify-owned.
- Partial COD is a separate AX-owned server flow.
- Secrets stay server-side.

## Bug -> where to look

| Symptom | Start here | Then inspect |
| --- | --- | --- |
| Size or colour cannot be selected | components/AddToCart.js, components/ProductPurchase.js | lib/product-variants.js, Shopify variants |
| Wrong variant added to bag | components/AddToCart.js, components/CartProvider.js | lib/product-variants.js, app/api/cart/route.js |
| Wrong colour image | components/ProductPurchase.js | lib/product-variants.js selectionImage(), Shopify variant images |
| Add to Bag disabled | components/AddToCart.js | missing option state, variant availability, Shopify stock |
| Complete the Look bug | components/CompleteLook.js | components/CartProvider.js, lib/product-variants.js |
| Cart quantity/remove/restore | components/CartProvider.js, components/CartDrawer.js | app/api/cart/route.js |
| Product missing from collection | app/collections/[handle]/page.js, lib/shopify.js | Shopify collection/tags, lib/navigation.js |
| Product facts wrong | lib/product-data.js, components/ProductDataPanel.js | Shopify ax_data metafields |
| Size chart missing/wrong | components/MeasurementFit.js, lib/measurements.js | ax_data.measurements, measurement_basis |
| Stylist says size guide missing | lib/stylist/fit.js | lib/product-data.js, ax_data.size_guide |
| Stylist UI bug | components/StylistPanel.js, components/stylist.css | components/StylistProvider.js |
| Stylist product/search answer wrong | lib/stylist/assistant.js, lib/stylist/tools.js | lib/stylist/catalog.js, lib/shopify-queries.js |
| Stylist model/cost routing | lib/stylist/model-router.js, lib/stylist/config.js | lib/stylist/openai.js, lib/stylist/usage.js |
| Delivery estimator wrong | components/ShippingEstimator.js | lib/delhivery.js, lib/delivery-estimate.js |
| Checkout shipping rate missing | app/api/shipping/rates/route.js | lib/delhivery.js, lib/shipping-policy.js, product weights |
| Free shipping wrong | lib/shipping-policy.js | cart/shipping UI |
| Sign-in loop/failure | lib/customer-account.js, app/account/authorize/route.js | Hostinger env, Shopify callbacks/origins |
| Profile/address/order history | app/account/, lib/customer-account.js | Customer Account API permissions |
| Partial COD problem | components/PartialCodCheckout.js | lib/partial-cod-server.js, Razorpay, Shopify Admin, Delhivery |
| Navigation island | components/AXIsland.js | app/refinements.css, app/globals.css |
| Playroom | components/AXPlayroom.js | app/playroom.css |
| Opening logo animation | components/OpeningIntro.js | app/layout.js, motion CSS |
| Homepage hero video missing/stalled | components/HeroVideo.js, app/page.js | Shopify Files/CDN primary source, backup source, underlying hero image |
| Search/filter | components/ProductGridClient.js | lib/navigation.js |
| Meta Pixel/CAPI | components/MetaMarketing.js, lib/meta.js | consent + production env |
| SEO/canonical/robots | lib/seo.js, app/robots.js, app/layout.js | AX_PUBLIC_SITE_URL, AX_ALLOW_INDEXING |

## PDP flow

The normal product-page path is:

app/products/[handle]/page.js
-> lib/shopify.js getProduct()
-> lib/product-data.js normalization
-> components/ProductPurchase.js
-> AddToCart.js / ShippingEstimator.js / ProductDataPanel.js / CompleteLook.js / MeasurementFit.js

ProductPurchase.js owns shared selected variant state. Child components should not create independent size/colour truth.

The selected options must resolve to a real Shopify ProductVariant before Add to Bag is enabled.

## Variant-selection invariants

lib/product-variants.js contains shared variant rules.

Keep these behaviors:
- A PDP with multiple sizes opens without silently preselecting a size unless a specific variant was requested.
- Sellable options come from real Shopify product/variant options.
- A measurement row does not create a sellable size.
- Changing colour can clear a conflicting size constraint so another colour remains browsable.
- Product imagery prefers the selected variant image, then a matching colour image, then the product fallback.
- Add to Bag submits the exact Shopify ProductVariant ID.

For a variant bug inspect: selected options, resolved variant ID, availableForSale, selectedOptions, variant image and quantityAvailable.

## Measurements and sizing

There are two separate data contracts.

Garment measurements:
- Shopify ax_data.measurements
- shown in the PDP Size & Fit experience
- may contain chest, length, sleeve, waist, thigh, knee, leg opening and other garment dimensions

Body-size guide:
- Shopify ax_data.size_guide
- used by lib/stylist/fit.js
- version 1
- basis body_circumference
- unit cm or inches
- sizes contain approved body ranges

Never silently reinterpret garment measurements as body measurements.

Fit names such as oversized, relaxed, bootcut and wide-leg affect how the garment should wear; they are not permission to fabricate missing body ranges.

## Cart and normal checkout

Key files:
- components/CartProvider.js
- components/CartDrawer.js
- app/api/cart/route.js
- lib/cart-session.js
- lib/shopify.js
- lib/shopify-queries.js

Normal Pay Online checkout uses Shopify's returned checkout URL. Do not replace it with a custom card form.

If cart behavior fails, check the browser request to /api/cart, the response, Sentry and Hostinger logs before changing code.

## Partial COD

Flow:
AX cart -> Delhivery quote/serviceability -> Razorpay advance -> Razorpay verification -> Shopify Admin order -> Delhivery COD shipment for the outstanding balance.

Key files:
- components/PartialCodCheckout.js
- lib/partial-cod.js
- lib/partial-cod-server.js
- app/api/partial-cod/
- lib/delhivery.js

Never remove idempotency or retry protections to make a payment failure appear fixed. One Razorpay payment must create at most one Shopify order and one Delhivery shipment.

## Customer accounts

Key files:
- lib/customer-account.js
- app/account/login/
- app/account/authorize/
- app/account/logout/
- app/account/status/
- app/account/actions/

Production values must agree:
- AX_SITE_ORIGIN=https://axstore.in
- callback=https://axstore.in/account/authorize
- logout=https://axstore.in/account/logout

A login problem may be environment or Shopify configuration rather than application code. Verify those first.

## Delhivery

Key files:
- lib/delhivery.js
- lib/delivery-estimate.js
- lib/shipping-policy.js
- components/ShippingEstimator.js
- app/api/shipping/rates/route.js

A shippable product with missing or zero weight must fail closed. Do not invent a default weight just to obtain a quote.

The free-shipping threshold has one source of truth in lib/shipping-policy.js.

## AX Stylist

UI:
- components/StylistPanel.js
- components/StylistProvider.js
- components/stylist.css

Server:
- app/api/stylist/route.js
- lib/stylist/assistant.js
- lib/stylist/tools.js
- lib/stylist/catalog.js
- lib/stylist/fit.js
- lib/stylist/model-router.js
- lib/stylist/openai.js
- lib/stylist/database.js

The Stylist must use verified Shopify/store facts. Missing product facts should cause retrieval, a question or a clear limitation, never invented stock, price, size or policy information.

Emergency kill switch: AX_STYLIST_ENABLED=false.

## Environment variables

.env.example is the authoritative variable inventory.

Rules:
- Production values belong in Hostinger/server settings.
- Never commit a production .env file.
- Never create NEXT_PUBLIC_ versions of server secrets.
- Missing environment values can look like code bugs.
- AX_SITE_ORIGIN must exactly match the deployment origin.
- Staging keeps AX_ALLOW_INDEXING=false.

See docs/HOSTINGER-STAGING.md and docs/LAUNCH-SECURITY.md.

## Source of truth

| Data | Source |
| --- | --- |
| Product title/description | Shopify product |
| Price / compare-at | Shopify product/variant |
| Size/colour | Shopify variants |
| Inventory | Shopify variants |
| Product/variant images | Shopify media |
| Shipping weight | Shopify variant |
| Fit/fabric/colour/product number | Shopify ax_data metafields |
| Garment measurements | ax_data.measurements |
| Body-size ranges | ax_data.size_guide |
| Shipping service/rate | Delhivery + AX shipping policy |
| Customer identity/orders | Shopify Customer Account API |
| Normal checkout | Shopify |
| Partial COD advance | Razorpay |
| Stylist profile/usage | private Supabase |
| Search indexing | SEO code + AX_ALLOW_INDEXING |

Do not hard-code a Shopify data correction into React when the underlying Shopify record is wrong.

## What the owner should send with a bug

Use this exact information:

Page:
Exact URL:
Device:
Browser:

What I did:
1.
2.
3.

Expected:
Actual:

Does it happen every time?
Did refreshing change it?

Product:
Selected size:
Selected colour:
Pincode if relevant:

Screenshot/video:
Approximate time:
Recent PR/change if known:

Never include passwords, API keys, tokens, payment credentials or private customer information.

## Developer debugging order

1. Reproduce the bug.
2. Check browser console and Network.
3. Check Sentry and Hostinger logs at the same time.
4. Decide whether the source is Shopify data, environment/configuration, external provider or application code.
5. Use the bug map above to find the owning file.
6. Add/update a regression test where practical.
7. Make the smallest fix.
8. Run npm test and npm run build.
9. Test the affected flow and an adjacent flow on staging.
10. Merge only after Security & Build passes.
11. Verify the actual deployment separately.

## Minimum regression by change

| Change | Minimum checks |
| --- | --- |
| PDP/variants | size/colour, image, Add to Bag, sold-out |
| Cart | add, quantity +/-, remove, refresh, checkout |
| Complete Look | main + companion selection and add |
| Measurements | size chart, unit, How to measure, Stylist handoff |
| Stylist | product search, fit, unavailable item, profile save/delete |
| Account | login, callback, profile, orders, address, logout |
| Shipping | serviceable/non-serviceable, Standard/Express, free shipping |
| Partial COD | quote, advance, verification, one order, one shipment, retry |
| Navigation/layout | mobile, desktop, keyboard focus, island |
| SEO | metadata, canonical, robots, sitemap |
| Marketing | consent, Pixel/CAPI deduplication, checkout events |

## High-risk files

Change these cautiously:
- lib/product-variants.js
- components/CartProvider.js
- app/api/cart/route.js
- lib/customer-account.js
- lib/partial-cod-server.js
- lib/delhivery.js
- lib/stylist/fit.js
- lib/stylist/security.js
- lib/request-security.js
- next.config.js

These files can affect checkout, authentication, money, customer data, API cost or security.

## Feature flags

Do not delete a feature just because it is disabled. Check its flag first.

Important flags:
- AX_STYLIST_ENABLED
- AX_STYLIST_IMAGES_ENABLED
- AX_PARTIAL_COD_ENABLED
- AX_RESTOCK_ALERTS_ENABLED
- AX_WHATSAPP_RETENTION_ENABLED
- AX_ALLOW_INDEXING

## Related documentation

- README.md — architecture overview
- .env.example — environment-variable inventory
- docs/HOSTINGER-STAGING.md — hosting
- docs/LAUNCH-SECURITY.md — production security
- docs/PRODUCT-DATA.md — product/metafield contract
- docs/MEASUREMENTS.md — measurement rules
- docs/AX-STYLIST-SETUP.md — Stylist setup
- docs/AX-STYLIST-VERIFICATION.md — Stylist verification
- docs/CUSTOMER-ACCOUNT-SETUP.md — account setup
- docs/SHIPPING-RATES.md — Delhivery rates
- docs/PARTIAL-COD.md — Partial COD
- docs/SEO-WEEKLY.md — SEO operations

## Handoff rule

Before changing production code, a developer should be able to answer:

1. Is this code, Shopify data, environment configuration or an external provider?
2. Which file owns the behavior?
3. What behavior must not be broken while fixing it?
4. What test or staging flow proves the fix?
5. How will the change reach production and how will production be verified?

If those answers are unclear, investigate first instead of patching symptoms.
