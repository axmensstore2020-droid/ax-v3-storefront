export const productFields=`id handle title description productType tags availableForSale featuredImage {url altText width height} priceRange {minVariantPrice {amount currencyCode}}`;
export const productsQuery=`query Products($first:Int!){products(first:$first,sortKey:CREATED_AT,reverse:true){nodes{${productFields}}}}`;
export const collectionQuery=`query Collection($handle:String!){collection(handle:$handle){id handle title description products(first:100,sortKey:COLLECTION_DEFAULT){nodes{${productFields}}}}}`;
export const productQuery=`query Product($handle:String!){product(handle:$handle){${productFields} images(first:8){nodes{url altText width height}} options{name optionValues{name}} variants(first:100){nodes{id title availableForSale price{amount currencyCode} selectedOptions{name value} image{url altText}}}}}`;
export const cartFields=`id checkoutUrl totalQuantity cost{subtotalAmount{amount currencyCode} totalAmount{amount currencyCode}} lines(first:100){nodes{id quantity cost{totalAmount{amount currencyCode}} merchandise{... on ProductVariant{id title image{url altText} product{title handle} price{amount currencyCode}}}}}`;
const result=`cart{${cartFields}} userErrors{field message}`;
export const cartOperations={
 get:`query Cart($id:ID!){cart(id:$id){${cartFields}}}`,
 create:`mutation CartCreate($lines:[CartLineInput!]){cartCreate(input:{lines:$lines,buyerIdentity:{countryCode:IN}}){${result}}}`,
 add:`mutation CartAdd($cartId:ID!,$lines:[CartLineInput!]!){cartLinesAdd(cartId:$cartId,lines:$lines){${result}}}`,
 update:`mutation CartUpdate($cartId:ID!,$lines:[CartLineUpdateInput!]!){cartLinesUpdate(cartId:$cartId,lines:$lines){${result}}}`,
 remove:`mutation CartRemove($cartId:ID!,$lineIds:[ID!]!){cartLinesRemove(cartId:$cartId,lineIds:$lineIds){${result}}}`
};
