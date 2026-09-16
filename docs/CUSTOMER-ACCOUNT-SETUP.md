# AX customer account setup

The V3 storefront uses Shopify's Customer Account API so sign-in, account data, order history and checkout remain Shopify-owned while the customer stays on the AX frontend. Without the configuration below, the Profile panel deliberately falls back to Shopify's hosted account page.

## Shopify setup

1. In Shopify Admin, enable **Customer accounts** under **Settings → Customer accounts**.
2. Open **Sales channels → Headless**, select the AX storefront, and open **Customer Account API** settings.
3. In the Customer Account API permissions for this storefront, enable at least **customer_read_customers** and **customer_read_orders**. Order history, line items, fulfillment and Shopify tracking data require `customer_read_orders`.
4. Use a **Confidential** client for this Next.js server application.
5. Add these callback URLs under **Application setup → Callback URI(s)**, each as a separate entry:

   - `https://aqua-oyster-550932.hostingersite.com/account/authorize`
   - `https://axstore.in/account/authorize`

6. Add the matching logout URLs under **Logout URI**:

   - `https://aqua-oyster-550932.hostingersite.com/account/logout`
   - `https://axstore.in/account/logout`

7. If Shopify shows **JavaScript origin(s)** for this client, add these origins without a path:

   - `https://aqua-oyster-550932.hostingersite.com`
   - `https://axstore.in`

   Never put `/account/authorize` or `/account/logout` in an origin field. Shopify may hide this field for confidential clients; that is expected.

The browser OAuth scope remains `openid email customer-account-api:full`. Customer data permissions such as `customer_read_orders` are granted to the Headless storefront in Shopify, not added to that OAuth scope string.

## Hostinger variables

Add these as server-side environment variables in the V3 deployment. Do not add them to GitHub, browser code or Shopify theme code:

| Variable | Value |
| --- | --- |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` | Client ID from Shopify Customer Account API settings |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET` | Confidential client secret from Shopify; never share it in chat |
| `SHOPIFY_CUSTOMER_ACCOUNT_SESSION_SECRET` | Separate random 32+ character secret used to encrypt the AX session cookie |
| `SHOPIFY_CUSTOMER_ACCOUNT_SCOPE` | `openid email customer-account-api:full` |
| `DELHIVERY_API_TOKEN` | Optional server-only production token from Delhivery One for live carrier scan history |

`SHOPIFY_STORE_DOMAIN` and `AX_SITE_ORIGIN` must already point to the same environment. Use the staging origin while testing, then redeploy with the production origin when `axstore.in` is live.

The app dynamically discovers Shopify endpoints instead of hardcoding them:

- `/.well-known/openid-configuration` provides authorization, token and logout endpoints.
- `/.well-known/customer-account-api` provides the Customer Account GraphQL endpoint.

Endpoint override variables remain available for troubleshooting, but are not required for the normal setup.

## Order history and tracking

`/account` reads the signed-in customer's 10 most recent Shopify orders. The account page can display order number, date, total, payment status, fulfillment status, line items, Shopify fulfillment events, estimated delivery, tracking number and carrier tracking URL.

Shopify tracking remains the fallback even when Delhivery API access is not configured. If a fulfillment is identified as Delhivery and `DELHIVERY_API_TOKEN` is present, AX requests live tracking from Delhivery's production Shipment Tracking API and adds the latest carrier status, location, estimated delivery and scan timeline.

The Delhivery token is used only on the AX server. The storefront does not expose a public arbitrary-AWB tracking proxy: AX only asks Delhivery about tracking numbers that Shopify returned on the currently authenticated customer's own orders.

If `customer_read_orders` is enabled after a customer already signed in and orders remain unavailable, sign out once and sign in again before troubleshooting further.

## Flow

- `/account/login` starts OAuth with state and PKCE.
- Shopify sends the browser to `/account/authorize` after sign-in.
- The server exchanges the code, sends the client ID plus confidential client credentials, encrypts the short-lived token session in an HttpOnly secure cookie and returns to `/account`.
- `/account` queries the signed-in customer's profile and order history; tokens never reach browser JavaScript.
- `/account` optionally enriches Delhivery fulfillments on the server when a production Delhivery token is configured.
- `/account/logout` clears the local session and uses Shopify's logout endpoint when available.

AX Stylist's anonymous Supabase profile remains separate from Shopify identity until a separately approved account-linking design is added.

References: [Getting started with the Customer Account API](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/getting-started), [Shopify Customer Account API reference](https://shopify.dev/docs/api/customer/latest), and the Delhivery One **Shipment Tracking API** documentation.
