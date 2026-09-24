import 'server-only';
import {cache} from 'react';
import {storefront} from './shopify.js';
import {navigation,styleWorlds,seasonalCollections} from './navigation.js';
import {normalizeMenu} from './content-utils.js';
import {navigationQuery,pageQuery,homepageCampaignsQuery} from './content-queries.js';
import {axLegalPolicies} from './legal-policies.js';

// Content permissions/outages must not prevent shoppers reaching the catalog.
async function readContent(query,variables) {
 try {return await storefront(query,variables);} catch {console.warn('AX content unavailable; using the default content.');return null;}
}
export const getNavigation=cache(async()=>{
 const data=await readContent(navigationQuery),domains=[process.env.SHOPIFY_STORE_DOMAIN,'axunisexstore.myshopify.com','dv80yn-su.myshopify.com',data?.shop?.primaryDomain?.host].filter(Boolean);
 return {
  categories:normalizeMenu(data?.categories,navigation,domains),
  styles:normalizeMenu(data?.styles,styleWorlds,domains),
  seasons:normalizeMenu(data?.seasons,seasonalCollections,domains)
 };
});
export const getPageContent=cache(async(handle)=>{
 const data=await readContent(pageQuery,{handle});
 return data?.page || null;
});
function fieldMap(fields=[]){return Object.fromEntries(fields.map(field=>[field.key,field]));}
function fieldValue(fields,key,fallback=''){return String(fields[key]?.value || '').trim() || fallback;}
function fieldBoolean(fields,key, fallback=true){
 const value=String(fields[key]?.value ?? '').trim().toLowerCase();
 return value ? value !== 'false' : fallback;
}
function mediaValue(fields,key){
 const image=fields[key]?.reference?.image;
 return image?.url ? {src:image.url,alt:image.altText || ''} : null;
}
function videoValue(fields,key){
 const video=fields[key]?.reference;
 if(video?.__typename!=='Video')return null;
 const sources=(video.sources||[]).filter(source=>source?.url&&String(source.mimeType||'').toLowerCase()==='video/mp4');
 if(!sources.length)return null;
 const source=[...sources].sort((a,b)=>Math.abs(Number(a.height||1080)-1080)-Math.abs(Number(b.height||1080)-1080))[0];
 return source?.url ? {src:source.url,poster:video.previewImage?.url || ''} : null;
}
function normalizeHomepageCampaign(node){
 const fields=fieldMap(node.fields),image=mediaValue(fields,'image'),mobileImage=mediaValue(fields,'mobile_image');
 const desktopVideo=videoValue(fields,'desktop_video'),mobileVideo=videoValue(fields,'mobile_video');
 return {
  id:node.id,handle:node.handle,type:node.type,
  slot:fieldValue(fields,'slot',node.handle),
  eyebrow:fieldValue(fields,'eyebrow'),title:fieldValue(fields,'title'),description:fieldValue(fields,'description'),
  imageSrc:image?.src || '',imageAlt:fieldValue(fields,'alt_text',image?.alt || ''),mobileImageSrc:mobileImage?.src || '',
  desktopVideoSrc:desktopVideo?.src || '',mobileVideoSrc:mobileVideo?.src || '',videoEnabled:fieldBoolean(fields,'video_enabled',true),
  ctaLabel:fieldValue(fields,'cta_label'),ctaLink:fieldValue(fields,'cta_link'),theme:fieldValue(fields,'theme','sage'),
  sortOrder:Number(fieldValue(fields,'sort_order','0')) || 0,active:fieldBoolean(fields,'active')
 };
}
export const getHomepageCampaigns=cache(async()=>{
 const data=await readContent(homepageCampaignsQuery);
 return (data?.metaobjects?.nodes || []).map(normalizeHomepageCampaign).filter(item=>item.active && (item.title || item.imageSrc)).sort((a,b)=>a.sortOrder-b.sortOrder);
});

// AX's customer-facing legal copy is versioned with the storefront so the headless
// experience cannot silently fall back to stale Shopify-generated templates.
export const getPolicies=cache(async()=>axLegalPolicies.map(policy=>({...policy,url:''})));
