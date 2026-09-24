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
const SEARCH_FILLER = new Set(['a','an','and','are','can','could','do','for','find','get','have','i','in','is','it','looking','me','my','need','new','of','please','show','some','the','this','to','want','with','you']);
const GARMENT_TERMS = new Set(['jacket','jackets','shirt','shirts','trouser','trousers','pant','pants','jean','jeans','tee','tees','t-shirt','t-shirts','hoodie','hoodies','sweatpant','sweatpants','cargo','cargos','short','shorts','coat','coats']);
export function catalogSearchQueries(query) {
  const tokens=String(query || '').toLowerCase().match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) || [];
  const useful=tokens.filter(token=>!SEARCH_FILLER.has(token));
  if(!useful.length) return [tokens.slice(0,4).join(' ')].filter(Boolean);
  const primary=useful.slice(0,5).join(' ');
  const garment=useful.find(token=>GARMENT_TERMS.has(token));
  // Keep the customer’s colour/style constraints for the first search, then
  // retry the garment alone if Shopify’s AND search finds no matching item.
  return [...new Set([primary, ...(garment && useful.length>1 ? [garment] : [])])];
}
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
    options:facts.options || [],variants:(p.variants?.nodes || []).map(v => ({id:v.id,title:v.title,sku:v.sku,availableForSale:v.availableForSale,selectedOptions:v.selectedOptions,price:v.price,image:v.image?.url?.startsWith('https://cdn.shopify.com/') ? v.image.url : ''})),
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
      const queries=catalogSearchQueries(query);
      const results=[];
      let hasMore=false;
      for(const candidate of queries) {
        const data=await read(stylistSearchQuery,{query:searchExpression(candidate,maxPrice)});
        results.push(...data.products.nodes);
        hasMore ||= Boolean(data.products.pageInfo?.hasNextPage);
        if(data.products.nodes.length) break;
      }
      // Storefront products(query:) has no documented sku: filter. Use the
      // explicit VARIANTS_SKU predictive-search field for number-like queries.
      const numberLike = /^[a-z0-9-]{3,80}$/i.test(query) && /\d/.test(query);
      const skuData = numberLike ? await read(stylistSkuQuery,{query}) : null;
      const found = [...results,...(skuData?.predictiveSearch?.products || [])].map(productFacts).filter(p => p && p.availableForSale && (typeof maxPrice !== 'number' || Number(p.price?.amount) <= maxPrice));
      return {products:[...new Map(found.map(p => [p.handle,p])).values()].slice(0,12),hasMore};
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
