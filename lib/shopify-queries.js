const AX_PRODUCT_KEYS = [
  'product_number', 'fit', 'fabric', 'color', 'colour', 'style', 'care',
  'measurement_unit', 'measurement_basis', 'size_guide', 'measurements',
  'size_recommendations', 'model_height', 'model_size', 'fabric_feel',
  'review_rating', 'review_count', 'ugc_images'
];

// Shopify requires a namespace of at least three characters in some Admin
// surfaces. AX's merchant-created fields therefore use `ax_data`; retain
// `ax.data` and `ax` as read-compatible legacy namespaces for existing
// catalog entries.
const AX_PRODUCT_IDENTIFIERS = ['ax_data', 'ax.data', 'ax']
  .flatMap(namespace => AX_PRODUCT_KEYS.map(key => `{namespace:"${namespace}",key:"${key}"}`))
  .join(',');

export const productFields=`id handle title description seo{title description} productType vendor tags updatedAt availableForSale featuredImage {url altText width height} priceRange {minVariantPrice {amount currencyCode}} compareAtPriceRange {minVariantPrice {amount currencyCode}} selectedOrFirstAvailableVariant {sku price{amount currencyCode} compareAtPrice{amount currencyCode} weight weightUnit requiresShipping quantityAvailable} options{name optionValues{name}} metafields(identifiers:[${AX_PRODUCT_IDENTIFIERS}]) {namespace key value}`;
export const productsQuery=`query Products($first:Int!){products(first:$first,sortKey:CREATED_AT,reverse:true){nodes{${productFields}}}}`;
export const homepageProductsQuery=`query HomepageProducts($first:Int!){products(first:$first,sortKey:CREATED_AT,reverse:true){nodes{id handle title productType tags featuredImage{url altText width height}}}}`;
export const collectionsQuery=`query Collections($first:Int!){collections(first:$first,sortKey:UPDATED_AT,reverse:true){nodes{id handle title description seo{title description} updatedAt products(first:1){nodes{id}}}}}`;
export const collectionQuery=`query Collection($handle:String!){collection(handle:$handle){id handle title description seo{title description} updatedAt products(first:100,sortKey:COLLECTION_DEFAULT){nodes{${productFields}}}}}`;
export const productQuery=`query Product($handle:String!){product(handle:$handle){${productFields} images(first:8){nodes{url altText width height}} options{name optionValues{name}} variants(first:100){nodes{id title sku availableForSale price{amount currencyCode} compareAtPrice{amount currencyCode} weight weightUnit requiresShipping quantityAvailable selectedOptions{name value} image{url altText}}}}}`;
export const merchantProductsQuery=`query MerchantProducts($first:Int!){products(first:$first,sortKey:CREATED_AT,reverse:true){nodes{${productFields} variants(first:100){nodes{id title sku availableForSale price{amount currencyCode} compareAtPrice{amount currencyCode} weight weightUnit requiresShipping quantityAvailable selectedOptions{name value} image{url altText}}}}}}`;
export const cartFields=`id checkoutUrl totalQuantity cost{subtotalAmount{amount currencyCode} totalAmount{amount currencyCode}} lines(first:100){nodes{id quantity cost{totalAmount{amount currencyCode}} merchandise{... on ProductVariant{id title selectedOptions{name value} image{url altText} product{title handle featuredImage{url altText}} price{amount currencyCode} weight weightUnit requiresShipping}}}}`;
const result=`cart{${cartFields}} userErrors{field message}`;
export const cartOperations={
 get:`query Cart($id:ID!){cart(id:$id){${cartFields}}}`,
 create:`mutation CartCreate($lines:[CartLineInput!]){cartCreate(input:{lines:$lines,buyerIdentity:{countryCode:IN}}){${result}}}`,
 createMany:`mutation CartCreateMany($lines:[CartLineInput!]){cartCreate(input:{lines:$lines,buyerIdentity:{countryCode:IN}}){${result}}}`,
 add:`mutation CartAdd($cartId:ID!,$lines:[CartLineInput!]!){cartLinesAdd(cartId:$cartId,lines:$lines){${result}}}`,
 addMany:`mutation CartAddMany($cartId:ID!,$lines:[CartLineInput!]!){cartLinesAdd(cartId:$cartId,lines:$lines){${result}}}`,
 update:`mutation CartUpdate($cartId:ID!,$lines:[CartLineUpdateInput!]!){cartLinesUpdate(cartId:$cartId,lines:$lines){${result}}}`,
 remove:`mutation CartRemove($cartId:ID!,$lineIds:[ID!]!){cartLinesRemove(cartId:$cartId,lineIds:$lineIds){${result}}}`
};
