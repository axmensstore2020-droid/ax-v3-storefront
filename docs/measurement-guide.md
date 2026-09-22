# AX garment measurements and diagrams

Compare garments with garments; body measurements belong in My Fit. Use cm and
state the measurement basis in Shopify. Never infer the basis from a large number.

| Category | Measurements to collect | Flat widths doubled for a circumference chart |
| --- | --- | --- |
| T-shirts, polos, shirts (short or long sleeves) | Chest, shoulder, body length, sleeve | Chest only |
| Sleeveless tops | Chest, shoulder, body length | Chest only |
| Hoodies, sweatshirts, jackets, blazers, coats | Chest, shoulder, body length excluding hood/collar, sleeve | Chest only |
| Jeans, trousers, chinos, cargos, joggers, sweatpants | Waist, hip, front rise, thigh, knee, inseam, outseam, leg opening | Waist, hip, thigh, knee, leg opening |
| Shorts | Waist, hip, front rise, thigh, inseam, outseam, leg opening | Waist, hip, thigh, leg opening |
| Chains | Open chain length; pendant separately if supplied | None |
| Belts | Buckle pin to middle hole; width | None |
| Caps | Inside opening circumference; adjustment range if applicable | None: measured around the opening directly |
| Eyewear | Lens width, bridge, temple length | None |
| Watches | Case width excluding crown; strap sections excluding case/buckle | None |

## Entry rules

- `measurement_basis=flat`: enter the actual flat widths. The storefront converts
  confirmed widths to circumference for the displayed chart, once.
- `measurement_basis=circumference`: enter full circumferences for chest, waist,
  hip, thigh, knee and leg opening. Enter all lengths as measured.
- `measurement_unit=cm`: use centimetres consistently across the record.
- Shoulder is seam to seam, **never doubled**. Body length starts at the highest
  shoulder point beside the neck. Sleeve starts at the actual shoulder seam.
- Measure elastic waist relaxed. If recording stretched waist, store an explicitly
  described range; do not stretch other garment widths while measuring.
- The guide's ×2 means double the customer's flat tape measurement to compare
  with a circumference chart. It never means double a number already in the chart.
- An unknown basis displays “Check basis”, not an assumed multiplier.
- Legacy `_cm` keys are recognized. Bottoms `length` maps to `outseam`.
- `crotch` is not automatically renamed to front rise: full crotch seam, front
  rise and back rise differ. Confirm the original measuring method.
- Paired legacy arrays may mean different measuring positions rather than a range.
  Confirm their meaning before using them for sizing. Knee position must match
  the chart's reference position. This update does not invent that reference.

The guide uses the fields actually present in a chart. Products with no chart show
category guidance only, with a notice that measurements have not been supplied.
No Shopify measurements or weights are changed by this UI update.

## Front-view reference redesign (2026-09-22)

The guide uses front-only technical drawings, lettered arrows and a separate instruction list. On narrow phones, instructions sit below the drawing; on wider screens they sit alongside it. Selecting a row highlights its arrow. Unknown fields remain visible as instructions without a fabricated measuring path. Back-rise guidance is textual only; no back illustration is displayed.

The Size chart tab stays visible even if measurements are unavailable, with an explicit empty state. Records labelled body measurements are identified as such and must not be compared directly with flat garment widths.

### Catalogue audit

Read-only Shopify audit: all 36 active products checked; 30 garments have `ax_data.measurements`. Six chains have no measurements. Black Armani Bootcut has measurements for 28/30/32 using legacy `_cm` keys. The current live PDP receives this data. Existing alias normalization preserves waist, outseam, thigh, knee, crotch and leg opening, including ambiguous arrays.

Merchant verification still needed:
- Five Premium Linen Button-Down colour products are labelled `Body measurements` although their rows also contain shoulder and length. Confirm the intended basis.
- Several tops list shoulder values around 100–134 cm. Re-measure seam to seam; shoulder is never doubled. Do not automatically halve these records.
- Bootcut thigh and knee contain pairs of values; their meaning is unconfirmed. `crotch` must not be renamed to front rise without confirmation.
- `Garment measurements` alone does not specify whether widths are flat or full circumference. The guide asks for confirmation instead of inferring ×2.

No Shopify measurement values were modified. Figma file creation and library inspection succeeded, but the Starter plan tool limit blocked canvas design operations. Production vectors were implemented and rendered directly instead.
