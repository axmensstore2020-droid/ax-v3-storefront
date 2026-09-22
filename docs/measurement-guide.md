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
