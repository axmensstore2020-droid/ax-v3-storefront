import 'server-only';
import sanitizeHtml from 'sanitize-html';
import {storefront,shopifyConfigured} from '../shopify.js';
import {productFields,productQuery} from '../shopify-queries.js';
import {policiesQuery,pageQuery} from '../content-queries.js';
import {normalizeProductData} from '../product-data.js';
import {isStoreProduct} from '../commerce.js';
import {hasUnresolvedTemplate} from '../content-utils.js';
import {stores,storeHours,storeDays,contactEmail} from '../store-info.js';

export const stylistSearchQuery = `query StylistSearch($query:String!){products(first:12,query:$query,sortKey:RELEVANCE){nodes{${productFields}} pageInfo{hasNextPage}}}`;
export const stylistSkuQuery = `query StylistSku($query:String!){predictiveSearch(query:$query,limit:10,types:[PRODUCT],searchableFields:[VARIANTS_SKU,TAG,TITLE]){products{${productFields}}}}`;
export const plainText = (value,limit=1600) => sanitizeHtml(String(value || ''),{allowedTags:[],allowedAttributes:{}}).slice(0,limit);
export function searchExpression(query,maxPrice=null) {
  // Search syntax is generated here. Never accept arbitrary Shopify operators.
  const terms = String(query || '').match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu)?.slice(0,8) || [];
  const words = terms.map(term => `"${term.slice(0,60)}"`).join(' AND ');
  const tag = terms.length === 1 && /[0-9]/.test(terms[0]) ? ` OR tag:"${terms[0]}"` : '';
  const price = typeof maxPrice === 'number' && Number.isFinite(maxPrice) && maxPrice >= 0 ? ` AND variants.price:<=${Math.min(maxPrice,1000000)}` : '';
  return `available_for_sale:true${words ? ` AND (${words}${tag})` : ''}${price}`;
}
export function productFacts(p) {
  if (!p || !isStoreProduct(p)) return null;
  const facts = normalizeProductData({...p,type:p.productType,sku:p.selectedOrFirstAvailableVariant?.sku,options:p.options?.map(o => ({name:o.name,values:o.optionValues?.map(v => v.name) || o.values || []}))});
  return {
    handle:p.handle,title:plainText(p.title,160),productNumber:facts.productNumberDisplay,
    description:plainText(p.description,600),type:plainText(p.productType,80),tags:(p.tags || []).slice(0,25),
    fit:facts.fit,fabric:facts.fabric,color:facts.color,style:facts.style,care:facts.care,
    measurementUnit:facts.measurementUnit,measurementBasis:facts.measurementBasis,sizeMeasurements:facts.sizeMeasurements,sizeGuide:facts.sizeGuide,
    availableForSale:Boolean(p.availableForSale),price:p.priceRange?.minVariantPrice || null,
    image:p.featuredImage?.url?.startsWith('https://cdn.shopify.com/') ? p.featuredImage.url : '',
    options:facts.options || [],variants:(p.variants?.nodes || []).map(v => ({id:v.id,title:v.title,sku:v.sku,availableForSale:v.availableForSale,selectedOptions:v.selectedOptions,price:v.price})),
    href:'/products/'+encodeURIComponent(p.handle)
  };
}
export function createCatalog() {
  async function read(query,variables={}) {
    if (!shopifyConfigured()) throw new Error('Live catalog is not connected.');
    const data = await storefront(query,variables,{revalidate:0});
    if (!data) throw new Error('Live catalog unavailable.');
    return data;
  }
  return {
    search:async(query,maxPrice) => {
      const data = await read(stylistSearchQuery,{query:searchExpression(query,maxPrice)});
      // Storefront products(query:) has no documented sku: filter. Use the
      // explicit VARIANTS_SKU predictive-search field for number-like queries.
      const numberLike = /^[a-z0-9-]{3,80}$/i.test(query) && /\d/.test(query);
      const skuData = numberLike ? await read(stylistSkuQuery,{query}) : null;
      const found = [...data.products.nodes,...(skuData?.predictiveSearch?.products || [])].map(productFacts).filter(p => p && p.availableForSale && (typeof maxPrice !== 'number' || Number(p.price?.amount) <= maxPrice));
      return {products:[...new Map(found.map(p => [p.handle,p])).values()].slice(0,12),hasMore:Boolean(data.products.pageInfo?.hasNextPage)};
    },
    product:async handle => {
      if (!/^[a-z0-9][a-z0-9-]{0,179}$/.test(handle)) return null;
      return productFacts((await read(productQuery,{handle})).product);
    },
    help:async topic => {
      if (topic === 'stores') return {stores,hours:storeHours,days:storeDays,timeZone:'Asia/Kolkata',contactEmail,link:'/stores'};
      if (topic === 'contact') return {contactEmail,link:'/contact',note:'Email the team. The assistant cannot access, change, cancel or refund orders.'};
      if (['about','careers','faqs'].includes(topic)) {
        const handle = {about:'about-us',careers:'careers',faqs:'faqs'}[topic];
        const {page} = await read(pageQuery,{handle});
        return {topic,text:page ? plainText(page.body,3500) : 'No published information was found. Ask AX.',link:'/'+topic};
      }
      const data = await read(policiesQuery);
      const policies = [data.refundPage || data.shop?.refundPolicy,data.shippingPage || data.shop?.shippingPolicy,data.termsPage || data.shop?.termsOfService,data.shop?.privacyPolicy];
      return {policies:policies.filter(p => p?.body && !hasUnresolvedTemplate(p.body)).map(p => ({title:p.title,text:plainText(p.body,3500)})),link:'/policies',contactEmail};
    }
  };
}
