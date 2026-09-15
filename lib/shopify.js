import 'server-only';
import {cache} from 'react';
import {fallbackProducts} from './catalog.js';
import {navigation,styleWorlds,seasonalCollections,categoryAliases,matchesCategory,matchesStyle} from './navigation.js';
import {isStoreProduct} from './commerce.js';
import {productsQuery,collectionQuery,productQuery} from './shopify-queries.js';
const domain=process.env.SHOPIFY_STORE_DOMAIN, privateToken=process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN, publicToken=process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const apiVersion=process.env.SHOPIFY_API_VERSION || '2026-07';
const usable=token => Boolean(token && !/replace_me|your_.*token/i.test(token));
export function shopifyConfigured(){return Boolean(domain && (usable(privateToken)||usable(publicToken)));}
export async function storefront(query,variables={}, {revalidate=60,buyerIp}={}) {
 if(!shopifyConfigured()) return null;
 if(!/^[a-z0-9-]+\.myshopify\.com$/.test(domain)) throw new Error('Invalid store domain configuration.');
 const response=await fetch('https://'+domain+'/api/'+apiVersion+'/graphql.json',{
  method:'POST',
  headers:{'Content-Type':'application/json',...(usable(privateToken)?{'Shopify-Storefront-Private-Token':privateToken}:{'X-Shopify-Storefront-Access-Token':publicToken}),...(buyerIp?{'Shopify-Storefront-Buyer-IP':buyerIp}:{})},
  body:JSON.stringify({query,variables}),
  ...(revalidate===0?{cache:'no-store'}:{next:{revalidate}}), signal:AbortSignal.timeout(12000)
 });
 if(!response.ok) throw new Error('Store unavailable ('+response.status+').');
 const json=await response.json();
 if(json.errors?.length) throw new Error('The store could not complete this request.');
 return json.data;
}
function normalizeProduct(p){return {id:p.id,handle:p.handle,title:p.title,description:p.description,type:p.productType || 'Menswear',tags:p.tags || [],availableForSale:p.availableForSale,image:p.featuredImage?.url || '',imageAlt:p.featuredImage?.altText || p.title,price:Number(p.priceRange?.minVariantPrice?.amount || 0),currency:p.priceRange?.minVariantPrice?.currencyCode || 'INR',demo:false};}
const demoProducts=() => fallbackProducts.filter(isStoreProduct).map(p => ({...p,demo:true,currency:'INR'}));
export const getProducts=cache(async(first=100) => {
 const data=await storefront(productsQuery,{first});
 return data?data.products.nodes.filter(isStoreProduct).map(normalizeProduct):demoProducts();
});
export const getCollection=cache(async handle => {
 const canonical=categoryAliases[handle] || handle;
 const legacy={outerwear:'Outerwear',formal:'Formal'},style=styleWorlds.find(entry=>entry.key===canonical);
 const item=navigation.find(entry=>entry.key===canonical) || style || seasonalCollections.find(entry=>entry.key===canonical) || (legacy[canonical]?{label:legacy[canonical]}:null);
 const data=await storefront(collectionQuery,{handle});
 // A real collection, even when empty, is authoritative. Do not repopulate it.
 if(data?.collection) return {...data.collection,products:data.collection.products.nodes.filter(isStoreProduct).map(normalizeProduct)};
 if(item) return {id:canonical,handle,title:item.label,products:(await getProducts()).filter(p=>style?matchesStyle(p,canonical):matchesCategory(p,canonical))};
 return null;
});
export const getProduct=cache(async handle => {
 const data=await storefront(productQuery,{handle});
 if(!data){const p=demoProducts().find(p => p.handle===handle);return p?{...p,images:p.image?[{url:p.image,altText:p.title}]:[],options:[],variants:[]}:null;}
 const p=data.product;
 if(!p || !isStoreProduct(p)) return null;
 return {...normalizeProduct(p),images:p.images.nodes,options:p.options.map(option => ({name:option.name,values:option.optionValues.map(value => value.name)})),variants:p.variants.nodes};
});
