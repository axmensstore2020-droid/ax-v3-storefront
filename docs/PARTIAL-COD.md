# AX Partial COD

Partial COD is intentionally **disabled by default**. Do not enable it until Razorpay payment verification, Shopify Admin order creation and Delhivery COD shipment creation have all passed staging with non-production/test orders.

## Customer calculation

The booking advance is:

`max(₹100, 10% of final order value rounded to the nearest ₹10)`

The advance is capped at the amount due. The remaining balance is the amount Delhivery should collect as COD.

Examples:

| Final order value | Advance | COD balance |
| ---: | ---: | ---: |
| ₹749 | ₹100 | ₹649 |
| ₹1,249 | ₹120 | ₹1,129 |
| ₹1,299 | ₹130 | ₹1,169 |
| ₹1,999 | ₹200 | ₹1,799 |
| ₹3,499 | ₹350 | ₹3,149 |

The shared calculation lives in `lib/partial-cod.js` and is covered by automated tests.

## Required production integrations

1. **Razorpay** — create the booking-advance payment server-side and verify the returned payment signature before accepting the order. Never expose the Razorpay secret in browser code.
2. **Shopify Admin GraphQL** — after verified payment, create the real order with the original Shopify variant IDs, shipping address, shipping line, a successful Razorpay transaction for the advance and financial status `PARTIALLY_PAID`. This requires an offline Admin API token with `write_orders`.
3. **Delhivery** — re-check that the destination supports COD, then create the shipment with payment mode COD and COD amount equal to the remaining balance, never the full invoice value. Use the exact account client name and pickup-location/warehouse name configured in Delhivery.
4. **Idempotency** — the Razorpay payment ID must map to at most one Shopify order and one Delhivery shipment. A retry must return the existing result rather than create duplicates.

Do not restore the old Shopify `Partial Payment` helper product. Partial COD is an order/payment flow, not a catalogue item.

## Refund and logistics treatment

The customer-facing wording is versioned in `lib/legal-policies.js`.

- AX-side cancellation, fulfilment failure, incorrect item, defective item or another legally required refund: refund the applicable advance and do not charge customer-attributable logistics deductions.
- Refused/undeliverable/customer-attributable cancellation after dispatch: actual forward shipping + actual RTO + applicable COD/logistics charges may be deducted.
- Successfully delivered order later accepted for a non-AX-fault return: actual forward shipping + actual reverse-shipping + applicable COD/logistics charges may be deducted. Do not call this RTO.
- Store the actual carrier/payment charges used for any deduction so customer support can explain the calculation.

## Activation variables

See `.env.example`:

- `AX_PARTIAL_COD_ENABLED`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `SHOPIFY_ADMIN_ACCESS_TOKEN`
- `DELHIVERY_CLIENT_NAME`
- `DELHIVERY_PICKUP_LOCATION`
- `AX_PARTIAL_COD_SECRET`

Keep the feature flag false until the end-to-end production-account test passes.
