import 'server-only';
import {contactEmail,stores} from './store-info.js';
import {productOptions,variantHref} from './product-variants.js';

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

const optionValue=(variant,pattern)=>(variant?.selectedOptions || []).find(option=>pattern.test(option?.name || ''))?.value || '';
const imageUrls=product=>{
 const images=(product?.images || []).map(image=>image?.url).filter(Boolean);
 if(!images.length && product?.image) images.push(product.image);
 return [...new Set(images)];
};
const offerForVariant=(product,variant)=>({
 '@type':'Offer',
 url:absoluteUrl(variantHref(product.handle,variant?.id)),
 priceCurrency:variant?.price?.currencyCode || product?.currency || 'INR',
 price:String(variant?.price?.amount ?? product?.price ?? ''),
 availability:`https://schema.org/${variant?.availableForSale?'InStock':'OutOfStock'}`,
 itemCondition:'https://schema.org/NewCondition',
 ...(variant?.sku?{sku:variant.sku}:{})
});
const textValue=value=>{
 if(value===null || value===undefined) return '';
 if(typeof value==='string' || typeof value==='number') return String(value).trim();
 if(Array.isArray(value)) return value.map(textValue).filter(Boolean).join('–');
 if(typeof value==='object') {
  const min=value.min ?? value.from, max=value.max ?? value.to;
  if(min!==undefined && max!==undefined) return `${min}–${max}`;
  if(value.value!==undefined) return String(value.value).trim();
 }
 return '';
};
const label=value=>String(value || '').replace(/[_-]+/g,' ').replace(/\b\w/g,match=>match.toUpperCase());
function productProperties(product,size=''){
 const properties=[];
 if(product?.fit) properties.push({'@type':'PropertyValue',name:'Fit',value:product.fit});
 if(product?.style) properties.push({'@type':'PropertyValue',name:'Style',value:product.style});
 if(product?.measurementBasis) properties.push({'@type':'PropertyValue',name:'Measurement basis',value:product.measurementBasis});
 const measurements=size && product?.sizeMeasurements?.[size];
 if(measurements && typeof measurements==='object' && !Array.isArray(measurements)) for(const [name,raw] of Object.entries(measurements)) {
  const value=textValue(raw);
  if(value) properties.push({'@type':'PropertyValue',name:label(name),value:product?.measurementUnit ? `${value} ${product.measurementUnit}` : value});
 }
 return properties;
}
function sharedProductFields(product,{includeColor=true}={}){
 const images=imageUrls(product),properties=productProperties(product);
 return {
  name:product.title,
  description:cleanDescription(product.description,product.title),
  ...(images.length?{image:images}:{}),
  brand:{'@type':'Brand',name:SITE_NAME},
  ...(product.type?{category:product.type}:{}),
  ...(includeColor && product.color?{color:product.color}:{}),
  ...(product.fabric?{material:product.fabric}:{}),
  ...(properties.length?{additionalProperty:properties}:{})
 };
}
const variationProperty=name=>{
 if(/\bsize\b/i.test(name)) return 'https://schema.org/size';
 if(/^colou?r$/i.test(String(name).trim())) return 'https://schema.org/color';
 if(/fabric|material/i.test(name)) return 'https://schema.org/material';
 if(/pattern/i.test(name)) return 'https://schema.org/pattern';
 return String(name || '').trim();
};

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

export function websiteJsonLd(){
 return {
  '@context':'https://schema.org','@type':'WebSite','@id':`${SITE_URL}/#website`,
  url:SITE_URL,name:SITE_NAME,inLanguage:'en-IN',publisher:{'@id':`${SITE_URL}/#organization`}
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
 const variants=product?.variants?.length ? product.variants : [{id:'',sku:product?.sku,availableForSale:product?.availableForSale,price:{amount:String(product?.price || ''),currencyCode:product?.currency || 'INR'}}];
 return {
  '@context':'https://schema.org','@type':'Product','@id':`${absoluteUrl(`/products/${product.handle}`)}#product`,
  ...sharedProductFields(product),url:absoluteUrl(`/products/${product.handle}`),
  ...(product.productNumberDisplay || product.sku?{sku:product.productNumberDisplay || product.sku}:{}),
  offers:variants.map(variant=>offerForVariant(product,variant))
 };
}

export function productGroupJsonLd(product){
 const options=productOptions(product).filter(option=>option.values?.length>1 && !(option.name==='Title' && option.values[0]==='Default Title'));
 const variants=product?.variants || [];
 if(!variants.length || !options.length) return productJsonLd(product);
 const variesBy=options.map(option=>variationProperty(option.name)).filter(Boolean);
 const colorVaries=options.some(option=>/^colou?r$/i.test(String(option.name).trim()));
 const groupId=product.productNumberDisplay || product.sku || product.id || product.handle;
 const groupUrl=absoluteUrl(`/products/${product.handle}`);
 return {
  '@context':'https://schema.org','@type':'ProductGroup','@id':`${groupUrl}#product-group`,
  ...sharedProductFields(product,{includeColor:!colorVaries}),
  productGroupID:String(groupId),variesBy,
  hasVariant:variants.map(variant=>{
   const size=optionValue(variant,/\bsize\b/i),color=optionValue(variant,/^colou?r$/i);
   const variantPath=variantHref(product.handle,variant.id),variantUrl=absoluteUrl(variantPath);
   const image=variant?.image?.url || imageUrls(product)[0];
   const properties=productProperties(product,size);
   const optionSuffix=(variant?.selectedOptions || []).filter(option=>!(option.name==='Title' && option.value==='Default Title')).map(option=>option.value).filter(Boolean).join(' / ');
   return {
    '@type':'Product','@id':`${variantUrl}#product`,name:optionSuffix?`${product.title} — ${optionSuffix}`:product.title,
    url:variantUrl,description:cleanDescription(product.description,product.title),brand:{'@type':'Brand',name:SITE_NAME},
    ...(product.type?{category:product.type}:{}),...(image?{image}:{}),
    ...(variant?.sku?{sku:variant.sku}:{}),...(size?{size}:{}),...(color?{color}:{}),...(product.fabric?{material:product.fabric}:{}),
    ...(properties.length?{additionalProperty:properties}:{}),
    offers:offerForVariant(product,variant)
   };
  })
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
