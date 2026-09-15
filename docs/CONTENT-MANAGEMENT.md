# AX V3 content management

Updated 15 September 2026. Shopify remains the commerce and content source. V3 reads changes with a 60-second revalidation interval; the first visit after expiry may serve the cached page while it refreshes.

## Menus

Edit Shopify **Content → Menus**. The three V3 menus were created separately from the existing theme menus.

| Menu title | Handle | Appears in |
| --- | --- | --- |
| AX V3 Categories | `ax-categories` | Right-side dropdown, product category selector, homepage category directory |
| AX V3 Style Collections | `ax-style-collections` | Homepage style section, Collections page, menu and Stylist panel |
| AX V3 Seasonal Collections | `ax-seasonal-collections` | Collections page and menu |

Add, rename, reorder or remove links here. Link new product groupings to a Shopify collection published to the Headless sales channel. V3 understands links to its own `axstore.in` URLs and Shopify collection/product/page URLs. Generic new Shopify pages are available at `/pages/<handle>`.

The category starting list mirrors Zara India's generic men's categories as inspected on 15 September 2026. Zara-branded programmes and collaborations are not AX inventory. The six initial style collections are Old money, Korean fits, Streetwear, Formal wear, Casual fits and Designer fits. Seasonal links start with New arrivals, Winter Arc and Summer Arc.

Existing Shopify collections own their membership, even if empty. Missing initial collections can show matching items from the actual catalogue. Seasonal campaigns, best sellers and discounts need an explicit matching tag/collection. A missing arbitrary new collection returns 404 until it exists in Shopify. Creating menu links does not create, delete or reclassify products.

## Editorial homepage campaigns

The homepage reads published Shopify metaobjects of type `ax_homepage_campaign`. This keeps campaign images and copy separate from the product catalogue.

### 1. Create the definition once

In Shopify Admin, open **Settings → Custom data → Metaobjects → Add definition** and create **AX Homepage Campaign** with the type `ax_homepage_campaign`. Add these fields:

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `slot` | Single line text | Yes | `hero`, `welcome`, `new-arrivals`, `linen`, `jeans`, `winter`, `special` or `close` |
| `eyebrow` | Single line text | No | Small campaign label |
| `title` | Single line text | Yes | Campaign headline; the homepage wraps it naturally |
| `description` | Multi-line text | No | Supporting copy |
| `image` | File | No | Desktop/editorial image |
| `mobile_image` | File | No | Optional mobile crop |
| `alt_text` | Single line text | No | Accessible image description |
| `cta_label` | Single line text | No | Button text |
| `cta_link` | URL | No | AX collection/page URL or a secure external URL |
| `theme` | Single line text | No | `sage`, `peach`, `blue`, `butter` or `lilac` |
| `sort_order` | Integer | No | Ordering value used when duplicate slots are present |
| `active` | True/false | No | Set false to hide an entry without deleting it |

### 2. Add campaign entries

Open **Content → Metaobjects → AX Homepage Campaign → Add entry**. Add one entry for each campaign slot, upload the model-led image from Shopify Files, and publish it. The storefront refreshes content within approximately 60 seconds.

The homepage has safe fallback content and imagery, so it continues to render while entries are being added. An entry overrides only the fields it contains; missing fields retain the editorial fallback.

### 3. Storefront retrieval

The headless storefront reads the published entries with the Storefront API and resolves `image`/`mobile_image` file references to responsive image URLs:

```graphql
query AXHomepageCampaigns {
  metaobjects(type: "ax_homepage_campaign", first: 50) {
    nodes {
      handle
      fields {
        key
        value
        reference {
          ... on MediaImage {
            image { url altText }
          }
        }
      }
    }
  }
}
```

The Storefront token must be allowed to read metaobjects. Keep the token server-side; it is already read from the existing Hostinger environment variables.

## Pages and policies

Edit Shopify **Online Store → Pages**:

| Shopify page handle | V3 route | Purpose |
| --- | --- | --- |
| `about-us` | `/about` | Existing AX brand story |
| `careers` | `/careers` | Add actual vacancies, store location and application instructions |
| `faqs` | `/faqs` | Customer questions and answers |
| `ax-stylist-info` | `/ax-stylist` | Legacy handle redirects to the code-maintained live feature/privacy guide |
| `contact` | `/policies#refund-policy` | Existing Refund and Cancellation Policy (its historical handle is `contact`) |
| `shipping-and-delivery-policy` | `/policies#shipping-policy` | Existing delivery policy |
| `terms-of-service` | `/policies#terms-of-service` | Existing terms |

`/policies` also retrieves standard policies from Shopify Settings → Policies. The existing Page versions of refund/shipping/terms take precedence because they currently hold AX's authored terms. Rich HTML is sanitized before rendering. A policy containing unresolved Shopify Liquid placeholders is linked to its Shopify-hosted policy URL instead of displaying the raw template.

The contact email is `contact@axstore.in`. Old support email references in the refund and terms pages were replaced; the terms page's old phone-support line was removed. Other policy wording was preserved. The terms still contain their original website-name references; review those separately before production launch.

Store branch names, directions and hours are in `lib/store-info.js`. Both branches show Monday–Sunday, 10am–10pm IST. `/contact` presents the email action and no phone support.

## Access and preview

The existing Storefront token needs `unauthenticated_read_content` for menus and Pages plus permission to read published metaobjects. Keep private tokens server-side. If content is unavailable, the catalog remains usable with initial navigation/copy, while Policies shows an availability message. Verify the store's live policies after deployment; no legal terms are invented for the sample preview.

The Stylist now has a configuration-gated AI implementation. It stays disabled until OpenAI, private Supabase storage and safety checks are configured. The live `/ax-stylist` guide is code-maintained to prevent stale Shopify page text from misrepresenting privacy or feature availability. Use [AX-STYLIST-SETUP.md](AX-STYLIST-SETUP.md) for activation, data entry and testing; update the merchant FAQ/policies to match before launch.

Zara's inspected navigation uses Helvetica Now Text, 13px, weight 300. V3 uses a light Helvetica stack with matching compact uppercase navigation and product text. The exact font requires an AX-licensed webfont; no Zara font file was copied. Font tokens are in `app/refinements.css`.

Reference: https://www.zara.com/in/en/man-l534.html
API references: https://shopify.dev/docs/api/storefront/2026-07/objects/Menu · https://shopify.dev/docs/api/storefront/2026-07/queries/page · https://shopify.dev/docs/api/storefront/2026-07/objects/Metaobject · https://shopify.dev/docs/api/storefront/2026-07/objects/Shop

## Verification for this change

- `npm test`: 22 tests passed, including menu URL handling, merchant menu removals, intentionally empty collections and structured product-data parsing.
- `npm run build`: production Webpack build passed on Node 24.19.0.
- `node scripts/smoke.mjs`: 50 routes passed, plus missing-product and invalid/unconnected cart checks.
- New Storefront queries, including the homepage metaobject query, passed Shopify schema validation.
- The local browser cannot access the container's loopback server. Visual review and live Storefront content verification must be completed through Hostinger staging.
- Razorpay, Delhivery and Shopify checkout code are unchanged. No new purchase was placed.
