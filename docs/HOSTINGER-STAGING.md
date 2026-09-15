# Hostinger staging handoff

Create a separate Node.js Web App with a temporary domain. Keep `axstore.in` attached to the existing live site until V3 is reviewed and the shopping flow passes.

1. In Hostinger hPanel, open Websites → Add website → Node.js Web App.
2. Choose GitHub and select `axmensstore2020-droid/ax-v3-storefront`, branch `main`.
3. Use the repository root. Select Next.js, Node.js 24 when offered (22 is also supported), and npm.
4. Build with `npm run build`. The production start command is `npm run start` if the panel asks for it. Use the detected Next.js server settings rather than a static export.
5. Choose a temporary domain for the first deployment. Without Shopify credentials it shows a clearly labeled, non-purchasable preview.
6. Privately add the environment variables below in hPanel, then rebuild/redeploy. Do not paste the private token into chat, a commit, or a screenshot.

| Variable | Value |
| --- | --- |
| `SHOPIFY_STORE_DOMAIN` | `axunisexstore.myshopify.com` |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | Enter the existing private Storefront token in hPanel |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Leave blank when using the private token |
| `SHOPIFY_API_VERSION` | `2026-07` |
| `AX_ALLOW_INDEXING` | `false` on staging |
| `SHOPIFY_BUYER_IP_HEADER` | Leave blank until Hostinger confirms a header it overwrites with the real buyer IP |
| `AX_INSTAGRAM_URL` | Optional verified full Instagram profile URL |

If configured, buyer IP forwarding accepts a single valid IP address. Do not trust an arbitrary client-supplied header. Verify Hostinger's proxy behavior before enabling it.

## Staging checks

- Review Home, category navigation, search, style edits, WIDE VIEW, island, dialogs, footer and PDP at phone and desktop widths.
- Confirm real Shopify products, prices, options and availability. Verify no `Partial Payment` product appears.
- Select size and color, add to bag, increase/decrease quantity, remove an item, and refresh to restore the bag.
- Open Shopify checkout using the returned checkout URL. Confirm Razorpay and Delhivery still appear through Shopify. Do not place a paid test order without the owner's approval.
- Confirm empty categories and unavailable variants behave clearly; verify that outages show errors.
- Check image loading and page responsiveness on a real mobile connection. Confirm contact details and final exchange policy before launch.

Only move the production domain after approval and successful live-commerce validation. Changing environment values that affect prerendered content requires a rebuild/redeployment. Search indexing is disabled by default; it is not access control.

Official references:
- https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- https://www.hostinger.com/support/how-to-add-environment-variables-during-node-js-application-deployment/
- https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage
- https://shopify.dev/docs/api/storefront/2026-07/objects/ProductOption
