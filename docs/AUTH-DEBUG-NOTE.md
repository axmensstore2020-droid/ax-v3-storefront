# Customer account staging diagnostic

Current staging origin: `https://aqua-oyster-550932.hostingersite.com`

This branch hardens Shopify Customer Account requests by sending the configured AX origin and a stable server user agent, and makes `/account` distinguish between a missing Shopify session and a successful Shopify session whose profile query failed.

After deployment, a successful OAuth exchange with a failed profile query should show **SIGNED IN** instead of returning to the normal sign-in CTA. This makes the remaining failure stage visible without exposing tokens or secrets.
