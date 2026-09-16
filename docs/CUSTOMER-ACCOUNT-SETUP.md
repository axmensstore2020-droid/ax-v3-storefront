# AX customer account setup

The V3 storefront can use Shopify's Customer Account API so sign-in, account data and checkout remain Shopify-owned while the customer stays on the AX frontend. Without the configuration below, the Profile panel deliberately falls back to Shopify's hosted account page.

## Shopify setup

1. In Shopify Admin, enable **Customer accounts** under **Settings → Customer accounts**.
2. Open **Sales channels → Headless**, select the AX storefront, and open **Customer Account API** settings.
3. Use a **Confidential** client for this Next.js server application.
4. Add these callback URLs under **Application setup → Callback URI(s)**, each as a separate entry:

   - `https://aqua-oyster-550932.hostingersite.com/account/authorize`
   - `https://axstore.in/account/authorize`

5. Add the matching logout URLs under **Logout URI**:

   - `https://aqua-oyster-550932.hostingersite.com/account/logout`
   - `https://axstore.in/account/logout`

6. If Shopify shows **JavaScript origin(s)** for this client, add these origins without a path:

   - `https://aqua-oyster-550932.hostingersite.com`
   - `https://axstore.in`

   Never put `/account/authorize` or `/account/logout` in an origin field. Shopify may hide this field for confidential clients; that is expected.

## Hostinger variables

Add these as server-side environment variables in the V3 deployment. Do not add them to GitHub, browser code or Shopify theme code:

| Variable | Value |
| --- | --- |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` | Client ID from Shopify Customer Account API settings |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET` | Confidential client secret from Shopify; never share it in chat |
| `SHOPIFY_CUSTOMER_ACCOUNT_SESSION_SECRET` | Separate random 32+ character secret used to encrypt the AX session cookie |
| `SHOPIFY_CUSTOMER_ACCOUNT_SCOPE` | `openid email customer-account-api:full` |

`SHOPIFY_STORE_DOMAIN` and `AX_SITE_ORIGIN` must already point to the same environment. Use the staging origin while testing, then redeploy with the production origin when `axstore.in` is live.

The app dynamically discovers Shopify endpoints instead of hardcoding them:

- `/.well-known/openid-configuration` provides authorization, token and logout endpoints.
- `/.well-known/customer-account-api` provides the Customer Account GraphQL endpoint.

Endpoint override variables remain available for troubleshooting, but are not required for the normal setup.

## Flow

- `/account/login` starts OAuth with state and PKCE.
- Shopify sends the browser to `/account/authorize` after sign-in.
- The server exchanges the code, sends the client ID plus confidential client credentials, encrypts the short-lived token session in an HttpOnly secure cookie and returns to `/account`.
- `/account` queries only the signed-in customer's basic profile; tokens never reach browser JavaScript.
- `/account/logout` clears the local session and uses Shopify's logout endpoint when available.

AX Stylist's anonymous Supabase profile remains separate from Shopify identity until a separately approved account-linking design is added.

References: [Getting started with the Customer Account API](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/getting-started) and [Customer Account API reference](https://shopify.dev/docs/api/customer/latest).
