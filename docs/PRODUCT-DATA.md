# AX product entry standard

Enter actual supplier/AX-verified information. Never invent composition, measurements, fit ranges, country of origin or care instructions. Shopify is the source of truth for commerce. The same merchant-owned AX fields are read by the product page and the AI Stylist.

## A. Create/verify definitions once

In Shopify **Settings → Metafields and metaobjects → Products**, add or inspect these definitions. Keep existing definitions and values; do not create duplicates. Enable Storefront API read access for each field used below. These are merchant-owned `ax` fields because your existing Shopify catalog and separate headless site share them; this is not a newly scaffolded Shopify app.

| Full namespace/key | Shopify type | Purpose / required data |
| --- | --- | --- |
| `ax.product_number` | Single line text | Unique stable style number, required |
| `ax.fit` | Single line text | Intended cut: regular, relaxed, oversized, tapered etc., required |
| `ax.fabric` | Single line text | Verified composition, e.g. 70% cotton / 30% linen, required |
| `ax.color` | Single line text | Accurate merchandising colour; variants remain authoritative |
| `ax.style` | Single line text | Old money, Korean fits, streetwear, formal wear etc. |
| `ax.care` | Multi-line text | Actual care-label guidance |
| `ax.measurement_unit` | Single line text | `cm` or `inches`, mandatory when measurements are present |
| `ax.measurement_basis` | Single line text | `circumference` or `flat_width`; mandatory for interpreting a garment chart |
| `ax.measurements` | JSON | Actual garment measurements for every exact Size option label |
| `ax.size_recommendations` | JSON | Optional garment notes only, never “recommended for everyone” |
| `ax.size_guide` | JSON | Approved body ranges for personal sizing; see section C |

The existing `ax.colour` alias is supported, but use `ax.color` consistently for new entries. Do not create a new field simply to duplicate native Shopify Size or Color options. Customer body measurements do not belong in public product metafields.

## B. Enter each product and its variants

| Area | Enter before publishing | Example / rule |
| --- | --- | --- |
| Identity | Title, product type/category, vendor, description | “Relaxed Linen Blend Shirt”; say what the garment actually is |
| Product number | Stable unique style number | `AX-SHT-000123`; never reuse after deletion |
| Search indexing | Put the exact product number in a plain Shopify tag, as well as the metafield | Tag `AX-SHT-000123`; product metafields are not universally indexed by Shopify search |
| Variants | Every Size × Color combination | Use standard option names `Size` and `Color`; no combined “M Black” single option |
| SKU | Unique SKU for every sellable variant | `AX-SHT-000123-CRM-M`; same base style across variants |
| Commerce | Price, genuine compare-at price, inventory, tracking, weight and shipping/tax fields | Do not create fake crossed-out prices or stock |
| Cut and construction | Intended fit, sleeve, collar, rise, leg shape, length, closure, lining, pockets | Put searchable details in the description; use the fit field for the cut |
| Fabric | Composition, texture, stretch, thickness/opacity where verified | “70% cotton, 30% linen; woven, no stretch”; don't infer from photos |
| Colour | Actual variant colours and clear colour names | Cream / washed black; avoid generic image-based guesses |
| Measurements | Actual chart for every size and colourway variation, clear unit/basis | Chest, shoulder, length, sleeve for tops; waist, hip, rise, inseam, leg opening for bottoms |
| Size guide | AX-approved BODY ranges and intended cut | Only where a merchandiser has verified the ranges; otherwise leave absent |
| Style/occasion/season | Clear plain tags for retrieval | `Old money`, `Linen`, `Summer Arc`, `Vacation`; collections should contain their real products |
| Care | Wash, bleach, iron, drying instructions from care label | No generic machine-wash claim for dry-clean-only pieces |
| Photos | Front, back, detail, model fit and every colourway | Accurate alt text, natural colour, no false fabric/fit claims |
| Model information | Optional model height, actual measurements, size worn | Description; this is a reference, not the shopper's recommended size |
| Publication | Active, published to the correct storefront/channel, variant availability reviewed | Exclude helper products; `Partial Payment` is filtered |

Product numbers are style identifiers, not random order numbers. Suggested prefixes: `SHT` shirts, `TEE` T-shirts, `TRS` trousers, `JNS` jeans, `JKT` jackets, `ACC` accessories. Assign the next unused sequence in your merchandising register; Shopify does not automatically enforce uniqueness of a product metafield. Do not rely on the preview-derived AX number or a single variant SKU as the permanent style number.

## C. Enter chart values — illustrative, not production measurements

First measure the actual garment. These example numbers only demonstrate the format:

`ax.measurement_unit`: `cm`

`ax.measurement_basis`: `circumference`

`ax.measurements`:

```json
{
  "S": {"chest":104,"shoulder":44,"length":70,"sleeve":62},
  "M": {"chest":110,"shoulder":46,"length":72,"sleeve":63}
}
```

Chest/waist/hip are **full circumferences** when basis is `circumference`. Shoulder, length, sleeve and inseam are linear measurements, never doubled. With `flat_width`, chest/waist/hip are flat widths; the current personal-ease engine deliberately does not infer or convert them. Choose a consistent method per chart. If cuts differ by colour, keep separate products/guides until variant-specific charts are implemented.

Optional `ax.size_recommendations`:

```json
{
  "S":"Straight hem; see garment measurements for length.",
  "M":"Same intended cut, with a longer body and sleeve."
}
```

Do not store “S recommended / M relaxed for everyone”: fit depends on the person's measurements. The PDP labels these as garment notes, not personal recommendations.

Then have AX verify appropriate **body measurement ranges** for this exact cut. The engine reads `ax.size_guide`:

```json
{
  "version":1,
  "unit":"cm",
  "basis":"body_circumference",
  "sizes":{
    "S":{"chest":[90,96]},
    "M":{"chest":[97,102]}
  },
  "ease_cm":{
    "regular":[8,14],
    "relaxed":[14,20],
    "oversized":[20,28]
  }
}
```

All dimensions present must have a numeric `[min,max]` on every size. Supported body comparison keys: `chest`, `waist`, `hip`, `inseam`. Every row must exactly match a Shopify Size option. Body ranges are inclusive. Overlap returns “between sizes”; outside all ranges returns no recommendation. Missing/invalid/inconsistent ranges return “ask AX”. Avoid unexplained gaps or overlaps when AX approves a chart.

`ease_cm` is optional and always in centimetres, regardless of the chart unit. Bands are lower-inclusive/upper-exclusive. They must be based on AX's fitting checks for that product, not universal standards. They currently label **chest ease for tops only**; do not apply this example to trousers. If absent, AX can identify the approved size but will not invent a selected-size feel. Preferred fit informs shopping advice; it does not automatically override the approved cut's size range.

Using only the verified example above: a 94 cm body chest matches S; if the shopper selects M (110 cm garment chest), 16 cm ease is in AX's relaxed band. The UI can then say S is the chart match while selected M is expected to feel relaxed. If S is unavailable in the selected colour, that is disclosed; another size is not silently substituted.

For bottoms, use verified waist/hip ranges plus any inseam requirement. Do not create a chest guide for jeans. The model will ask for the dimensions this product's guide actually requires.

## D. Retrieve and verify

1. Publish a test product to the headless storefront and open its product page.
2. Check product number, fabric, intended fit, colours, care, chart unit/basis and all size rows.
3. Search the exact product number. Its exact-number Shopify tag and SKUs are essential for AI lookup; native Shopify search is used across the catalog, not only the first 100 local results.
4. Open “Find my size with AX” after selecting size and colour. Enter synthetic test measurements and check the expected deterministic result when the AI service is enabled.
5. Test missing data and an unavailable colour/size. The assistant must acknowledge these cases.
6. Re-check each guide with a human before production use.

The integration reads the definitions' values with the existing Storefront product query and `metafields(identifiers: ...)`, then validates/normalizes them. If a field isn't visible, inspect its Storefront read permission and publication rather than duplicating data in code. No Admin token is required by the runtime.

## E. Store content and ongoing updates

Keep policies authoritative in Shopify. Keep About, FAQs and Careers factual; no invented vacancies. The code reads the existing published pages and policy sources. Store directions and hours currently come from `lib/store-info.js`; changes to those constants need a code deployment. They are not editable via the campaign metaobject.

Homepage imagery is managed through the existing `ax_homepage_campaign` metaobjects. See [CONTENT-MANAGEMENT.md](CONTENT-MANAGEMENT.md); product tags are not the primary editorial campaign control.

Each weekly drop: assign product numbers, enter variants/stock, fill actual fabric/fit/care, measure every size, verify guide if available, tag style/season/number, upload photos, publish, then test number search and one fit case. There is no AI “training” upload step: the assistant retrieves current Shopify data.
