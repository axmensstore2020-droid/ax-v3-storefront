# AX Meta Ads setup

The AX headless storefront has a consent-gated Meta marketing layer. It is intentionally separate from AX Stylist and never sends Stylist chats, photos, body measurements, fit profiles, passwords, payment credentials or account documents to Meta.

## What the AX storefront sends

After a visitor accepts optional marketing cookies, the storefront can send the same event ID through the browser Pixel and the server-side Conversions API so Meta can deduplicate the pair:

- `PageView`
- `ViewContent` with product / variant identifier, product name, value and currency
- `AddToCart` after Shopify confirms the item was actually added
- `InitiateCheckout` when the shopper leaves AX for checkout

The server endpoint allowlists only commerce fields. It rejects cross-origin requests, requires the current marketing-consent cookie, limits body size, rate-limits requests and never accepts arbitrary personal fields.

## Production environment variables

Set these directly in Hostinger; do not paste secrets into chat or commit them to GitHub:

- `META_PIXEL_ID` — Meta dataset / pixel ID. This ID is not secret.
- `META_CAPI_ACCESS_TOKEN` — server-only Conversions API access token.
- `META_GRAPH_API_VERSION` — the API version shown by the current Meta setup, in the form `vNN.N`. AX deliberately does not hard-code a version that can become stale.
- `META_CAPI_TEST_EVENT_CODE` — optional while testing in Events Manager; remove it after validation.
- `META_IP_HEADER` — optional. Leave blank unless Hostinger confirms a specific proxy header is overwritten by Hostinger and cannot be spoofed by the visitor.
- `AX_SITE_ORIGIN` — must exactly match the deployed AX storefront origin for the server event endpoint.

After adding or changing `META_PIXEL_ID`, rebuild/redeploy the app because the Content Security Policy is generated from deployment environment variables.

## Consent behavior

The Meta script does not load until the shopper chooses **Accept marketing**. Choosing **Only essential** prevents AX from loading the Pixel or sending Conversions API events. A **Cookie choices** control appears in the footer whenever the Meta integration is configured so the shopper can reopen the preference panel.

The storefront wording stays provider-neutral. The Privacy / Policies disclosure should name Meta and explain the advertising and measurement purpose.

## Purchase event and product catalogue

AX can track the full headless storefront journey up to checkout. The successful `Purchase` happens on Shopify's checkout / post-purchase surface, outside the AX Next.js app. Do not fake a Purchase when the customer merely clicks checkout.

For reliable purchase attribution and dynamic product ads, connect the store's official Meta / Facebook & Instagram integration in Shopify and connect the correct Meta business, dataset and catalogue. Shopify's web-pixel system is designed to access storefront, checkout and post-purchase customer events, which is the appropriate place to capture the completed purchase.

When that integration is connected:

1. Verify the `Purchase` event in Meta Events Manager using a real test checkout.
2. Confirm the product IDs used by the Meta catalogue match the IDs shown on AX `ViewContent` / `AddToCart` events. AX currently sends the numeric Shopify variant ID when one is available.
3. Check that Meta is not receiving duplicate Purchase events from multiple Shopify integrations.
4. Remove `META_CAPI_TEST_EVENT_CODE` after testing.

## Launch test

Before spending on ads:

1. Open the production site in a clean browser and choose **Only essential**. Confirm no Meta script/event is sent.
2. Reopen **Cookie choices**, accept marketing, and confirm `PageView` appears in Meta Test Events.
3. View a real product and confirm `ViewContent`.
4. Add the item and confirm one browser + one server `AddToCart` pair with the same event ID / deduplicated result.
5. Start checkout and confirm `InitiateCheckout`.
6. Finish a test order through Shopify and confirm exactly one `Purchase` event from the Shopify checkout integration.
7. Confirm no AX Stylist content appears in any Meta event payload.

## Campaign readiness

Once the catalogue and Purchase event are verified, Meta can optimize campaigns for actual sales instead of link clicks. Use the Shopify catalogue for dynamic product / retargeting ads, and keep AX product titles, prices, availability and imagery current so ads stay aligned with the storefront.
