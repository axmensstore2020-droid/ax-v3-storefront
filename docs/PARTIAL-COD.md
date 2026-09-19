# AX Partial COD

Partial COD is intentionally **disabled by default**. The storefront flow now exists, but do not enable it until Razorpay payment verification, Shopify Admin order creation and Delhivery COD shipment creation have all passed staging with non-production/test orders.

## Customer calculation

The courier COD handling fee charged to the Partial COD order is:

`max(₹40, 2% of product bill value)`

The booking advance is:

`max(₹100, 10% of final order value rounded to the nearest ₹10)`

The COD handling fee is disclosed when the customer chooses Partial COD and is shown as its own line before payment. Pay Online does not include this fee. For Partial COD, AX quotes Delhivery freight without embedding a COD overhead, then adds the account's COD handling rule explicitly so it is not double-counted.

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

## Customer flow

1. The bag keeps normal **Pay Online** checkout unchanged; prepaid customers do not need to enter an address in the AX cart.
2. **Partial COD** first asks only for a 6-digit pincode. AX checks the delivery partner's COD serviceability flag before allowing the customer to continue.
3. A previously checked delivery pincode is reused automatically. If COD is unavailable, the bag keeps Pay Online available and does not ask for the customer's full address.
4. After COD eligibility is confirmed, **Partial COD** opens the AX-owned checkout page and reuses the pincode.
5. AX re-checks COD serviceability and live Standard/Express freight before payment.
6. The customer sees products, shipping, the exact COD handling fee, final order value, booking advance and remaining COD balance before payment.
5. Razorpay collects only the booking advance.
6. AX verifies the Razorpay signature and captured payment server-side.
7. Shopify receives a real order with the original variant IDs, a successful Razorpay advance transaction and financial status `PARTIALLY_PAID`.
8. Delhivery receives a COD shipment whose COD amount is the Shopify outstanding balance, not the full invoice value.
9. A successful order clears the browser bag. If finalization fails after payment, the UI keeps the successful Razorpay response and offers an idempotent **Retry order confirmation** action without asking the customer to pay again.

The feature is hidden unless every required server-side setting is present and `AX_PARTIAL_COD_ENABLED=true`.

## Required production integrations

1. **Razorpay** — create the booking-advance payment server-side and verify the returned payment signature before accepting the order. Never expose the Razorpay secret in browser code.
2. **Shopify Admin GraphQL** — after verified payment, create the real order with the original Shopify variant IDs, shipping address, shipping line, a successful Razorpay transaction for the advance and financial status `PARTIALLY_PAID`. AX uses a Dev Dashboard API-only app with `read_orders` and `write_orders`; the server exchanges `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` for a short-lived Admin API token and refreshes it automatically.
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
- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`
- `SHOPIFY_ADMIN_ACCESS_TOKEN` (legacy fallback only)
- `DELHIVERY_CLIENT_NAME`
- `DELHIVERY_PICKUP_LOCATION`
- `AX_PARTIAL_COD_SECRET`

Keep the feature flag false until the end-to-end production-account test passes.


## Staging acceptance before enabling

- Use Razorpay test credentials first and confirm automatic capture is enabled. While Razorpay is in test mode, AX must not create a live Delhivery shipment; the confirmation screen should explicitly say that shipment booking was skipped.
- Confirm a successful advance creates exactly one Shopify order with status `PARTIALLY_PAID`.
- Confirm the Shopify order total, advance transaction and outstanding amount match the amounts shown to the customer.
- Confirm the Delhivery account accepts the selected `Surface` / `Express` shipment mode for the AX account.
- Confirm the Delhivery shipment is COD and its COD amount equals Shopify's outstanding balance.
- Retry the confirmation endpoint with the same Razorpay payment and confirm it does not create a second Shopify order or Delhivery shipment.
- Test a pincode where prepaid works but COD does not; Partial COD must remain unavailable.
- Test an out-of-stock variant between quote and payment; Shopify inventory policy must fail closed.
- Test a browser/network interruption after Razorpay success and verify the retry path completes the existing paid attempt without a second charge.

The current browser-return flow is intentionally feature-gated. Before broad production rollout, add and validate a Razorpay webhook recovery path so a captured advance can still be finalized if the buyer closes the browser before the success callback reaches AX.
