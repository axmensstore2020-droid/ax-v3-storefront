# AX product upload checklist

Every product should carry the same core information before it is published. Shopify is still the source of truth for title, description, variants, price, inventory and checkout; the optional `ax` metafields add the fit information customers need on the product page.

## Required Shopify fields

Complete these fields in **Products** for every new item:

| Area | What to enter | Example |
| --- | --- | --- |
| Product identity | Title, product type/category, vendor and a clear description | `Relaxed Oxford Shirt`, `Shirts`, `AX` |
| Product number | A unique, human-readable AX number | `AX-SHT-004` |
| Images | At least three useful views, with accurate alt text | Front, detail, back |
| Options | Use the real option names, usually `Size` and `Color` | `Size: S, M, L`; `Color: Black` |
| Variants | One row per sellable combination | Size + colour + price + stock |
| SKU | A unique SKU on every variant | `AX-SHT-004-M-BLK` |
| Price and inventory | Selling price, compare-at price when relevant, inventory and tracking | `₹2,499`, 12 units |
| Merchandising | Tags for category, collection, season and style | `Streetwear`, `Summer Arc` |

## AX metafields

Create these definitions once in **Settings → Custom data → Products**, using namespace `ax`. The storefront reads these keys from the Storefront API:

| Key | Type | Required? | Example |
| --- | --- | --- | --- |
| `product_number` | Single line text | Yes | `AX-SHT-004` |
| `fit` | Single line text | Yes | `Relaxed through the body` |
| `fabric` | Single line text | Yes | `100% cotton poplin` |
| `color` | Single line text | Yes | `Washed black` |
| `style` | Single line text | Recommended | `Streetwear` |
| `care` | Multi-line text | Recommended | `Machine wash cold. Line dry.` |
| `measurement_unit` | Single line text | Recommended | `inches` or `cm` |
| `measurements` | JSON text | Yes when sizes matter | See below |
| `size_recommendations` | JSON text | Yes when sizes matter | See below |

Garment measurements use the exact size labels from the product's `Size` option. Keep dimensions consistent across a product and use one unit throughout:

```json
{
  "S": {"chest": "38", "length": "27", "shoulder": "17"},
  "M": {"chest": "40", "length": "28", "shoulder": "18"},
  "L": {"chest": "42", "length": "29", "shoulder": "19"}
}
```

Size notes explain the experience of choosing each size. Include one note for every size when possible:

```json
{
  "S": "Recommended based on a closer fit",
  "M": "Relaxed fit",
  "L": "Loose layering fit"
}
```

The PDP shows the selected size's note immediately. If a note includes “recommended”, the PDP marks that size as recommended. The optional measurement checker compares a customer's chest measurement with the smallest garment chest measurement that is at least that value and suggests the corresponding size. Customers can still choose any available size.

## Product number search

The site search indexes the product number, every variant SKU, title, tags, description, fit, fabric, colour and style. A customer can search `AX-SHT-004` or a variant SKU and find the product. For a short transition period, the storefront also accepts these fallbacks:

- a variant SKU;
- a tag such as `AX:Product number=AX-SHT-004`;
- a description line such as `Product number: AX-SHT-004`.

If no explicit number exists, the storefront displays the selected variant SKU. As a final preview-only fallback it derives an `AX-######` number from the Shopify product ID; replace this with a real AX number before launch.

## Editorial homepage imagery

The homepage is an editorial welcome page, not a product catalogue. It uses product images as campaign photography and never shows product cards, prices or inventory there.

To control the first two homepage images from Shopify, add one of these tags to the product:

| Tag | Homepage placement |
| --- | --- |
| `home-hero` | Main welcome image |
| `home-secondary` | Supporting campaign image |

The remaining campaign images are selected from product title, type, style and tags. Use clear merchandising tags such as `Linen`, `Denim`, `Jeans`, `Winter Arc`, `Jacket` and `Special prices` so the right image appears in the relevant editorial section. If no matching tag exists, the homepage safely uses another available product image as a fallback.

This means campaign imagery can be refreshed through Shopify without editing the homepage code. For the strongest editorial result, upload model-led product photography and mark the intended images with the homepage tags above.

## Pre-publish check

Before changing a product to Active, confirm: product number is unique; every variant has a SKU, price and stock state; size and colour names match the variant rows; fit and fabric are filled; measurement rows cover every size; the unit is stated; size notes include the recommended option; care instructions are accurate; images and alt text describe the same colourway; and style/category tags match the AX menu.
