import 'server-only';
import {cache} from 'react';
import {storefront} from './shopify.js';
import {navigation,styleWorlds,seasonalCollections} from './navigation.js';
import {normalizeMenu,hasUnresolvedTemplate} from './content-utils.js';
import {navigationQuery,pageQuery,policiesQuery,homepageCampaignsQuery} from './content-queries.js';

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
function normalizeHomepageCampaign(node){
 const fields=fieldMap(node.fields),image=mediaValue(fields,'image'),mobileImage=mediaValue(fields,'mobile_image');
 return {
  id:node.id,handle:node.handle,type:node.type,
  slot:fieldValue(fields,'slot',node.handle),
  eyebrow:fieldValue(fields,'eyebrow'),title:fieldValue(fields,'title'),description:fieldValue(fields,'description'),
  imageSrc:image?.src || '',imageAlt:fieldValue(fields,'alt_text',image?.alt || ''),mobileImageSrc:mobileImage?.src || '',
  ctaLabel:fieldValue(fields,'cta_label'),ctaLink:fieldValue(fields,'cta_link'),theme:fieldValue(fields,'theme','sage'),
  sortOrder:Number(fieldValue(fields,'sort_order','0')) || 0,active:fieldBoolean(fields,'active')
 };
}
export const getHomepageCampaigns=cache(async()=>{
 const data=await readContent(homepageCampaignsQuery);
 return (data?.metaobjects?.nodes || []).map(normalizeHomepageCampaign).filter(item=>item.active && (item.title || item.imageSrc)).sort((a,b)=>a.sortOrder-b.sortOrder);
});
export const getPolicies=cache(async()=>{
 const data=await readContent(policiesQuery);
 if(!data) return [];
 const shop=data.shop || {};
 const candidates=[
  ['refund-policy',data.refundPage || shop.refundPolicy],
  ['shipping-policy',data.shippingPage || shop.shippingPolicy],
  ['terms-of-service',data.termsPage || shop.termsOfService],
  ['privacy-policy',shop.privacyPolicy],['terms-of-sale',shop.termsOfSale],
  ['legal-notice',shop.legalNotice],['subscription-policy',shop.subscriptionPolicy],['contact-information',shop.contactInformation]
 ];
 return candidates.filter(([,p])=>p?.body?.trim()).map(([key,p])=>({key,title:p.title,body:hasUnresolvedTemplate(p.body)?'':p.body,url:p.url || ''}));
});
