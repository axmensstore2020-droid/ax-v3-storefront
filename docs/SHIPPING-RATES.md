# AX live shipping rates

AX exposes two customer-facing domestic methods at Shopify checkout:

- **Standard Delivery** → Delhivery Surface (`md=S`)
- **Express Delivery** → Delhivery Express (`md=E`)

The callback is server-side. The Delhivery token is never sent to the browser. Checkout rates come from Delhivery's production invoice-charge API for the actual destination pincode and Shopify cart weight, then AX adds the configured per-order operational fee. The current default is **₹3** for Delhivery WhatsApp communication: ₹1 Shipment Picked Up + ₹2 Out for Delivery with OTP.

## Inputs

- Fixed origin/pickup: **641011, Coimbatore**
- Destination: customer's six-digit Indian pincode from Shopify's carrier-rate request
- Weight: Shopify variant packed weight × quantity. A shippable item with no positive weight fails closed instead of undercharging.
- Payment mode: **Pre-paid**
- Serviceability: Delhivery pincode API must report prepaid serviceability before rates are offered.
- International shipping is not handled by this callback.

The active catalog was checked before this integration: all 32 shippable variants across the current 3 products have positive packed weights (350 g, 400 g, or 650 g).

## Environment

Set these privately in Hostinger. Never commit the real values.

```text
DELHIVERY_API_TOKEN=<existing production token>
DELHIVERY_ORIGIN_PIN=641011
AX_SHIPPING_ORDER_FEE=3
AX_SHIPPING_CALLBACK_SECRET=<random 32+ character secret>
```

The Shopify carrier service callback URL is:

```text
https://<production-or-staging-origin>/api/shipping/rates?key=<AX_SHIPPING_CALLBACK_SECRET>
```

The shared key is required because Shopify carrier callbacks do not use the storefront's same-origin browser guard. Rotate the secret if the callback URL is exposed.

## Verification baseline

These are the Delhivery One calculator totals confirmed on 18 September 2026. They are **carrier totals before AX's ₹3 operational fee** and are useful for validating the API integration.

| Destination | Pincode | Weight | Surface | Express |
| --- | ---: | ---: | ---: | ---: |
| Chennai | 600001 | 500 g | ₹42.78 | ₹45.14 |
| Bengaluru | 560001 | 500 g | ₹42.78 | ₹45.14 |
| Kochi | 682001 | 500 g | ₹42.78 | ₹45.14 |
| Mumbai | 400001 | 500 g | ₹68.52 | ₹94.14 |
| Delhi | 110001 | 500 g | ₹68.52 | ₹94.14 |
| Kolkata | 700001 | 500 g | ₹68.52 | ₹94.14 |
| Guwahati | 781001 | 500 g | ₹80.76 | ₹108.84 |
| Srinagar | 190001 | 500 g | ₹94.24 | ₹122.32 |
| Port Blair | 744101 | 500 g | ₹94.24 | ₹122.32 |
| Chennai | 600001 | 1 kg | ₹81.98 | ₹84.34 |
| Mumbai | 400001 | 1 kg | ₹132.20 | ₹178.68 |

For example, if the API returns the confirmed Mumbai 500 g totals, checkout should show **₹71.52 Standard** and **₹97.14 Express** after the ₹3 AX fee.

Do not hard-code these prices into checkout. Delhivery's API remains the source of truth because diesel, peak and other carrier charges can change.

## Safe rollout

1. Deploy this code with the four server-side variables above.
2. Test the callback against the verified pincodes and 500 g / 1 kg cases.
3. Create a Shopify carrier service pointing to the callback.
4. Add the carrier-calculated methods to the Domestic delivery profile.
5. Verify checkout on real Indian pincodes. Standard and Express should appear only when Delhivery returns those services.
6. Keep the existing static ₹100 Standard rate during the first staging check. Remove it only after live carrier rates are confirmed, so a deployment/configuration error cannot silently remove domestic shipping.
7. Leave the International ₹1800 method unchanged.

The callback deliberately does not invent delivery dates. Delhivery's rate API provides the charge, while the One rate calculator separately displays TAT. Add checkout ETAs only after a reliable production TAT source is integrated and verified.

## Carrier API behavior

Delhivery documents the invoice-charge result as an approximate shipping charge and limits the invoice API to 40 requests per minute. AX currently makes one Surface and one Express charge request per checkout quote after serviceability succeeds. If checkout traffic grows enough to approach the limit, add short-lived server-side caching or a dedicated rate service before increasing traffic.

The endpoint returns HTTP 503 when Delhivery is unavailable or configuration/weight data is unsafe. Unsupported or non-serviceable destinations return an empty rate list.
