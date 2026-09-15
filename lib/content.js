import 'server-only';
import {cache} from 'react';
import {storefront} from './shopify.js';
import {navigation,styleWorlds,seasonalCollections} from './navigation.js';
import {normalizeMenu,hasUnresolvedTemplate} from './content-utils.js';
import {navigationQuery,pageQuery,policiesQuery} from './content-queries.js';

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
