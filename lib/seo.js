import 'server-only';
import {contactEmail,stores} from './store-info.js';

export const SITE_NAME="AX Men’s Store";
export const SITE_URL=(()=>{
 const fallback='https://axstore.in';
 try {
  const value=new URL(process.env.AX_PUBLIC_SITE_URL || fallback);
  return /^https?:$/.test(value.protocol) ? value.origin : fallback;
 } catch { return fallback; }
})();

export const absoluteUrl=path=>new URL(path || '/',SITE_URL).toString();
export const cleanDescription=(value,fallback='')=>String(value || fallback || '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,160);
export const jsonLd=value=>JSON.stringify(value).replace(/</g,'\\u003c');

export function pageMetadata({title,description,path='/',image='/ax-logo.jpg',type='website'}) {
 const summary=cleanDescription(description,'Menswear curated by AX in Coimbatore, delivered across India.');
 return {
  title,
  description:summary,
  alternates:{canonical:path},
  openGraph:{title,description:summary,url:path,siteName:SITE_NAME,type,images:image?[{url:image}]:undefined},
  twitter:{card:'summary_large_image',title,description:summary,images:image?[image]:undefined}
 };
}

export function organizationJsonLd(){
 return {
  '@context':'https://schema.org','@type':'Organization','@id':`${SITE_URL}/#organization`,
  name:SITE_NAME,url:SITE_URL,logo:absoluteUrl('/ax-logo.jpg'),email:contactEmail,
  areaServed:{'@type':'Country',name:'India'},
  ...(process.env.AX_INSTAGRAM_URL?{sameAs:[process.env.AX_INSTAGRAM_URL]}:{})
 };
}

export function storeJsonLd(){
 return stores.map(store=>({
  '@context':'https://schema.org','@type':'ClothingStore','@id':`${SITE_URL}/stores#${store.key}`,
  name:`${SITE_NAME} — ${store.name}`,url:absoluteUrl(`/stores#${store.key}`),email:contactEmail,hasMap:store.directions,
  address:{'@type':'PostalAddress',addressLocality:'Coimbatore',addressRegion:'Tamil Nadu',addressCountry:'IN'},
  openingHoursSpecification:{'@type':'OpeningHoursSpecification',dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],opens:'10:00',closes:'22:00'}
 }));
}

export function breadcrumbJsonLd(items=[]){
 return {
  '@context':'https://schema.org','@type':'BreadcrumbList',
  itemListElement:items.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,item:absoluteUrl(item.path)}))
 };
}

export function productJsonLd(product){
 const images=(product?.images || []).map(image=>image?.url).filter(Boolean);
 if(!images.length && product?.image) images.push(product.image);
 const variants=product?.variants?.length ? product.variants : [{id:'',sku:product?.sku,availableForSale:product?.availableForSale,price:{amount:String(product?.price || ''),currencyCode:product?.currency || 'INR'}}];
 const offers=variants.map(variant=>({
  '@type':'Offer',
  url:absoluteUrl(`/products/${product.handle}${variant?.id?`?variant=${encodeURIComponent(variant.id)}`:''}`),
  priceCurrency:variant?.price?.currencyCode || product?.currency || 'INR',
  price:String(variant?.price?.amount ?? product?.price ?? ''),
  availability:`https://schema.org/${variant?.availableForSale?'InStock':'OutOfStock'}`,
  itemCondition:'https://schema.org/NewCondition',
  ...(variant?.sku?{sku:variant.sku}:{})
 }));
 return {
  '@context':'https://schema.org','@type':'Product','@id':`${absoluteUrl(`/products/${product.handle}`)}#product`,
  name:product.title,url:absoluteUrl(`/products/${product.handle}`),
  description:cleanDescription(product.description,product.title),
  ...(images.length?{image:images}:{}),
  ...(product.productNumberDisplay || product.sku?{sku:product.productNumberDisplay || product.sku}:{}),
  brand:{'@type':'Brand',name:SITE_NAME},
  ...(product.type?{category:product.type}:{}),
  ...(product.color?{color:product.color}:{}),
  ...(product.fabric?{material:product.fabric}:{}),
  offers
 };
}

export function collectionJsonLd(collection){
 return {
  '@context':'https://schema.org','@type':'ItemList',
  name:collection.title,url:absoluteUrl(`/collections/${collection.handle}`),
  itemListElement:(collection.products || []).slice(0,100).map((product,index)=>({
   '@type':'ListItem',position:index+1,url:absoluteUrl(`/products/${product.handle}`),name:product.title
  }))
 };
}
