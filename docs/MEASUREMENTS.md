# AX garment measurement standard

This is the source of truth for garment measurement data used by the AX V3 product page and AX Stylist. Measure the real garment; never estimate measurements from photos or generic brand charts.

## Shopify fields

Use these product metafields:

- `ax_data.measurement_unit` = `cm`
- `ax_data.measurement_basis` = `circumference`
- `ax_data.measurements` = JSON keyed by the exact Shopify `Size` option labels
- `ax_data.size_guide` = separate AX-approved **body** measurement ranges for deterministic size recommendations

Do not put customer/body measurements inside `ax_data.measurements`. Do not use `size_guide` as a garment chart.

## Canonical measurement rules

All stored garment values are centimetres.

**Full garment circumference:** `chest`, `waist`, `hip`, `thigh`, `leg_opening`. If you measure these flat, multiply the flat width by 2 before entering Shopify. Example: flat chest 52 cm → stored chest 104 cm.

**Linear — never doubled:** `shoulder`, `length`, `front_length`, `sleeve`, `front_rise`, `inseam`, `outseam`.

The storefront defaults to CM. Its IN view is derived from the canonical CM value using `cm ÷ 2.54`, rounded to one decimal. Do not maintain a second inch chart in Shopify.

## Required fields by category

| Category | Required garment fields | SVG markers |
| --- | --- | --- |
| T-shirt / tee | `chest`, `shoulder`, `length`, `sleeve` | A chest · B shoulder · C length · D sleeve |
| Shirt | `chest`, `shoulder`, `front_length`, `sleeve` | A chest · B shoulder · C front length · D sleeve |
| Hoodie | `chest`, `shoulder`, `length`, `sleeve` | A chest · B shoulder · C length · D sleeve |
| Jacket | `chest`, `shoulder`, `length`, `sleeve` | A chest · B shoulder · C length · D sleeve |
| Bottom / trousers / jeans / cargos | `waist`, `hip`, `front_rise`, `thigh`, `inseam`, `outseam`, `leg_opening` | A waist · B hip · C front rise · D thigh · E inseam · F outseam · G leg opening |
| Shorts | `waist`, `hip`, `front_rise`, `thigh`, `inseam`, `outseam`, `leg_opening` | A waist · B hip · C front rise · D thigh · E inseam · F outseam · G leg opening |

## JSON examples

T-shirt:

```json
{
  "S": {"chest":104,"shoulder":44,"length":70,"sleeve":22},
  "M": {"chest":110,"shoulder":46,"length":72,"sleeve":23}
}
```

Shirt:

```json
{
  "M": {"chest":110,"shoulder":46,"front_length":74,"sleeve":63},
  "L": {"chest":116,"shoulder":48,"front_length":76,"sleeve":64}
}
```

Bottom:

```json
{
  "30": {"waist":78,"hip":100,"front_rise":29,"thigh":62,"inseam":76,"outseam":103,"leg_opening":42},
  "32": {"waist":83,"hip":105,"front_rise":30,"thigh":65,"inseam":76,"outseam":104,"leg_opening":44}
}
```

Use the exact size labels that exist on the Shopify product. If the option is `M`, use `M`; if it is `32`, use `32`.

## How to take the measurements

Lay the garment naturally on a flat surface without stretching it.

For tops, measure pit-to-pit for chest and multiply by 2; shoulder seam to shoulder seam for shoulder; highest shoulder point to hem for length/front length; and shoulder seam to sleeve end for sleeve.

For bottoms, measure waistband edge-to-edge and multiply by 2 for waist; the widest hip line edge-to-edge and multiply by 2; crotch seam to top waistband for front rise; thigh width just below the crotch and multiply by 2; crotch seam to hem for inseam; top waistband to hem along the outer leg for outseam; and hem opening edge-to-edge multiplied by 2 for leg opening.

Keep the garment relaxed. Do not pull elastic waistbands unless AX intentionally defines and documents a separate stretched measurement.

## Body `size_guide` stays separate

`ax_data.size_guide` contains merchandiser-approved body ranges such as chest/waist/hip/inseam ranges. AX Stylist may compare a customer's supplied body measurements with those ranges. It must not infer a size from height, weight or a photo when an approved body guide is absent.

If body ranges are missing, overlapping, inconsistent, or the recommended variant is sold out, AX should disclose that rather than inventing another size.
