# AX weekly SEO routine

The technical SEO layer is automatic. New Shopify products and useful collections flow into AX metadata, structured data and the sitemap without code changes.

## Every weekly drop

1. **Product title** — use the real searchable product name, not internal shorthand. Example: `Black Relaxed Fit Linen Shirt`, not `Black Shirt 01`.
2. **Description** — write a unique useful description covering fit, fabric, colour, styling/use and important product details. Do not copy the same paragraph across products.
3. **Shopify search-engine listing** — when useful, set an SEO title and meta description. AX reads Shopify's SEO fields automatically.
4. **Product data** — complete product type, colour, fit, fabric, product number/SKU, variants, price and stock. Keep image alt text descriptive.
5. **Measurements and size guidance** — keep the AX product metafields accurate. Visible fit, size and measurement content is also reflected in product structured data where appropriate.
6. **Collection placement** — add the product to the most relevant real Shopify collection(s). Avoid creating near-duplicate collections for the same search intent.
7. **Collection description** — for important collections, maintain a short original description that explains what shoppers will find there. AX displays it and uses Shopify SEO fields when available.
8. **Internal links** — feature important new collections/products from navigation, homepage campaigns or relevant editorial/help content where it makes sense.
9. **Quality check** — open the product and collection on AX and confirm title, description, image, price, stock, canonical URL and fit information are correct.

## AI search / AEO / GEO

Treat AEO and GEO as an extension of good SEO, not a separate trick. AX should stay useful to shoppers first while exposing the same facts cleanly to search and AI systems.

- Keep important product facts visible as normal page text: description, fit, fabric, colour, size choices, measurements, delivery and exchange information.
- Keep structured data consistent with what the shopper can actually see. Do not add hidden claims, fake ratings, fake reviews or unavailable stock.
- AX emits `WebSite`, `Organization`, product/variant, collection and breadcrumb structured data automatically. Apparel products with sellable variants use `ProductGroup` markup so size and colour relationships are explicit.
- Public launch crawling is controlled by `AX_ALLOW_INDEXING`. Staging remains blocked. When indexing is enabled, public pages are available to normal search crawlers and OAI-SearchBot while account/API routes stay disallowed.
- Do not create thin pages for every imaginable AI query. Add genuinely useful guides or FAQs only when they help customers choose, size, style, care for or understand AX products.
- An `llms.txt` file is not required for Google AI visibility. If AX ever adds one for another service, treat it as optional documentation rather than a ranking feature.

## Google Search Console

After production indexing is enabled:

- Submit `https://axstore.in/sitemap.xml` once. The sitemap updates automatically after catalogue changes.
- Check **Pages / Indexing** for blocked, duplicate or not-indexed URLs.
- Check **Performance** weekly for queries, pages, clicks and impressions. Improve pages that have impressions but weak click-through rates before inventing new keywords.
- Review the generative-AI/AI-feature reporting available in Search Console when it is enabled for the property.
- Use URL Inspection for a small number of important new launches when faster discovery matters. Do not request indexing for every minor edit.

## What not to do

- Do not rewrite every page weekly just to change the date or appear fresh.
- Do not stuff location or fashion keywords unnaturally into every paragraph.
- Do not create dozens of empty or almost-identical collection pages.
- Do not publish AI-generated descriptions without checking product facts.
- Do not change established product URLs casually. If a handle must change, add a permanent redirect.
- Do not add special "AI schema" or hidden keyword blocks. There is no separate AX markup that guarantees inclusion in an AI answer.

## Monthly check

Review the best-performing search terms and landing pages, slow pages/Core Web Vitals, broken links/404s, duplicate titles/descriptions, image quality/alt text, collection depth and local-store search visibility.

SEO compounds over time. For AX, the weekly advantage comes from consistently publishing accurate products, useful collections and internal links while the technical layer keeps discovery signals current.
