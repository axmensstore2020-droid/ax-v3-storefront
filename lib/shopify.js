import 'server-only';
import {cache} from 'react';
import {fallbackProducts} from './catalog.js';
import {navigation,styleWorlds,seasonalCollections,categoryAliases,matchesCategory,matchesStyle} from './navigation.js';
import {isStoreProduct} from './commerce.js';
import {productOptions} from './product-variants.js';
import {productsQuery,homepageProductsQuery,collectionsQuery,collectionQuery,productQuery} from './shopify-queries.js';
import {normalizeProductData} from './product-data.js';
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
function normalizeProduct(p){
 const firstVariant=p.selectedOrFirstAvailableVariant || p.variants?.nodes?.[0];
 const price=Number(firstVariant?.price?.amount ?? p.priceRange?.minVariantPrice?.amount ?? 0);
 const rawCompareAt=Number(firstVariant?.compareAtPrice?.amount ?? p.compareAtPriceRange?.minVariantPrice?.amount ?? 0);
 const compareAtPrice=Number.isFinite(rawCompareAt) && rawCompareAt>price ? rawCompareAt : null;
 return normalizeProductData({id:p.id,handle:p.handle,title:p.title,description:p.description,seo:p.seo || null,vendor:p.vendor || '',type:p.productType || 'Menswear',tags:p.tags || [],updatedAt:p.updatedAt || '',metafields:p.metafields || [],sku:firstVariant?.sku || '',variantSku:firstVariant?.sku || '',availableForSale:p.availableForSale,image:p.featuredImage?.url || '',imageAlt:p.featuredImage?.altText || p.title,price,currency:firstVariant?.price?.currencyCode || p.priceRange?.minVariantPrice?.currencyCode || 'INR',compareAtPrice,demo:false});
}
function demoProduct(p) {
 const normalized=normalizeProductData({...p,demo:true,currency:'INR'});
 const sizes=[...new Set([...Object.keys(normalized.sizeMeasurements || {}), ...Object.keys(normalized.sizeFits || {})])];
 if(!sizes.length) return normalized;
 return {...normalized,options:[{name:'Size',values:sizes}],variants:sizes.map(size => ({id:`demo-${normalized.id}-${size}`,title:size,sku:`${normalized.productNumber}-${size}`,availableForSale:true,price:{amount:String(normalized.price),currencyCode:normalized.currency},compareAtPrice:normalized.compareAtPrice?{amount:String(normalized.compareAtPrice),currencyCode:normalized.currency}:null,selectedOptions:[{name:'Size',value:size}]}))};
}
const demoProducts=() => fallbackProducts.filter(isStoreProduct).map(demoProduct);
export const getProducts=cache(async(first=100) => {
 const data=await storefront(productsQuery,{first});
 return data?data.products.nodes.filter(isStoreProduct).map(normalizeProduct):demoProducts();
});
export const getHomepageProducts=cache(async(first=24) => {
 const data=await storefront(homepageProductsQuery,{first});
 if(!data) return demoProducts().slice(0,first).map(product=>({
  id:product.id,handle:product.handle,title:product.title,type:product.type || '',tags:product.tags || [],
  image:product.image || '',imageAlt:product.imageAlt || product.title
 }));
 return data.products.nodes.filter(isStoreProduct).map(p=>({
  id:p.id,handle:p.handle,title:p.title,type:p.productType || '',tags:p.tags || [],
  image:p.featuredImage?.url || '',imageAlt:p.featuredImage?.altText || p.title
 }));
});
export const getCollections=cache(async(first=100) => {
 const data=await storefront(collectionsQuery,{first});
 const real=(data?.collections?.nodes || []).filter(collection=>collection?.handle && collection.products?.nodes?.length).map(({products,...collection})=>collection);
 const products=await getProducts(250), seen=new Set(real.map(collection=>collection.handle));
 const virtual=[];
 for(const item of [...navigation,...styleWorlds,...seasonalCollections]) {
  if(!item?.href?.startsWith('/collections/') || !item.key || seen.has(item.key)) continue;
  const isStyle=styleWorlds.some(entry=>entry.key===item.key);
  const hasProducts=products.some(product=>isStyle?matchesStyle(product,item.key):matchesCategory(product,item.key));
  if(!hasProducts) continue;
  seen.add(item.key);
  virtual.push({id:item.key,handle:item.key,title:item.label,description:'',seo:null,updatedAt:''});
 }
 return [...real,...virtual];
});
export const getCollection=cache(async handle => {
 const canonical=categoryAliases[handle] || handle;
 const legacy={outerwear:'Outerwear',formal:'Formal'},style=styleWorlds.find(entry=>entry.key===canonical);
 const item=navigation.find(entry=>entry.key===canonical) || style || seasonalCollections.find(entry=>entry.key===canonical) || (legacy[canonical]?{label:legacy[canonical]}:null);
 const data=await storefront(collectionQuery,{handle});
 // A real collection, even when empty, is authoritative. Do not repopulate it.
 if(data?.collection) return {...data.collection,products:data.collection.products.nodes.filter(isStoreProduct).map(normalizeProduct)};
 if(item) return {id:canonical,handle,title:item.label,description:'',seo:null,updatedAt:'',products:(await getProducts()).filter(p=>style?matchesStyle(p,canonical):matchesCategory(p,canonical))};
 return null;
});
export const getProduct=cache(async handle => {
 const data=await storefront(productQuery,{handle});
 if(!data){const p=demoProducts().find(p => p.handle===handle);return p?{...p,images:p.image?[{url:p.image,altText:p.title}]:[]}:null;}
 const p=data.product;
 if(!p || !isStoreProduct(p)) return null;
 return normalizeProductData({...normalizeProduct(p),images:p.images.nodes,options:productOptions({...p,variants:p.variants.nodes}),variants:p.variants.nodes});
});
