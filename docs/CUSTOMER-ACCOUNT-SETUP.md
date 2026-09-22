# AX customer account setup

The V3 storefront uses Shopify's Customer Account API so sign-in, account data, order history, saved addresses and checkout remain Shopify-owned while the customer stays on the AX frontend. Without the configuration below, the Profile panel deliberately falls back to Shopify's hosted account page.

## Shopify setup

1. In Shopify Admin, enable **Customer accounts** under **Settings → Customer accounts**.
2. Open **Sales channels → Headless**, select the AX storefront, and open **Customer Account API** settings.
3. In the Customer Account API permissions for this storefront, enable **customer_read_customers**, **customer_write_customers** and **customer_read_orders**. Profile/address display requires `customer_read_customers`, profile/address editing requires `customer_write_customers`, and order history/fulfillment/tracking requires `customer_read_orders`.
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

The browser OAuth scope remains `openid email customer-account-api:full`. Customer data permissions such as `customer_read_orders` and `customer_write_customers` are granted to the Headless storefront in Shopify, not added to that OAuth scope string.

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

## Account hub

`/account` is the AX customer hub. It includes:

- Passwordless Shopify customer sign-in and sign-out.
- The 10 most recent orders, line items, totals, payment and fulfillment status.
- Shopify fulfillment events, estimated delivery and carrier tracking links.
- Optional live Delhivery status/location/scan history when `DELHIVERY_API_TOKEN` is configured.
- Customer name, sign-in email and phone display.
- Customer name editing through the Customer Account API.
- Saved/default delivery addresses plus address create, edit, make-default and remove actions.
- A session-aware Profile sheet in the AX navigation island so signed-in customers are no longer shown sign-in copy.

The profile and order queries are deliberately separated. If an optional customer-data permission is unavailable, sign-in and order history can continue independently rather than the whole account page failing.

Customer email and phone are displayed as account identity fields. Shopify's current `CustomerUpdateInput` for the Customer Account API supports first and last name updates; AX therefore does not pretend to edit email or phone through that mutation.

## Order history and tracking

Shopify tracking remains the fallback even when Delhivery API access is not configured. If a fulfillment is identified as Delhivery and `DELHIVERY_API_TOKEN` is present, AX requests live tracking from Delhivery's production Shipment Tracking API and adds the latest carrier status, location, estimated delivery and scan timeline.

The Delhivery token is used only on the AX server. The storefront does not expose a public arbitrary-AWB tracking proxy: AX only asks Delhivery about tracking numbers that Shopify returned on the currently authenticated customer's own orders.

If a Customer Account API permission is enabled after a customer already signed in and the related data remains unavailable, sign out once and sign in again before troubleshooting further.

## Flow

- There is no separate password-style AX registration form. With Shopify customer accounts, **Sign in or create account** opens Shopify's secure account flow; a new customer follows the email verification steps there and then returns to AX.
- `/account/login` starts OAuth with state and PKCE.
- Shopify sends the browser to `/account/authorize` after sign-in.
- The server exchanges the code, sends the client ID plus confidential client credentials, encrypts the short-lived token session in an HttpOnly secure cookie and returns to `/account`.
- `/account/status` reports only whether an AX customer session is present/active so the Profile sheet can show the correct signed-in state; it does not expose the Shopify access token.
- `/account` queries profile details and order history independently; tokens never reach browser JavaScript.
- Profile/address writes are server-side POST actions and verify same-origin requests before calling Shopify.
- `/account` optionally enriches Delhivery fulfillments on the server when a production Delhivery token is configured.
- `/account/logout` clears the local session and uses Shopify's logout endpoint when available.

AX Stylist's anonymous Supabase profile remains separate from Shopify identity until a separately approved account-linking design is added.

References: [Getting started with the Customer Account API](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/getting-started), [Shopify Customer Account API reference](https://shopify.dev/docs/api/customer/latest), and the Delhivery One **Shipment Tracking API** documentation.
