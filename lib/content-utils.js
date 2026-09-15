const pageRoutes={'about-us':'/about','connect-with-us':'/contact',contact:'/policies#refund-policy','shipping-and-delivery-policy':'/policies#shipping-policy','terms-of-service':'/policies#terms-of-service',careers:'/careers',faqs:'/faqs','ax-stylist-info':'/ax-stylist'};
// Only AX-owned URLs are routed into the headless app.
export function normalizeMenuUrl(value,domains=[]) {
 if(typeof value !== 'string' || !value.trim() || /[\\\u0000-\u001f]/.test(value) || value.startsWith('//')) return null;
 let url;try {url=new URL(value,'https://axstore.in');} catch {return null;}
 if(!['https:','http:'].includes(url.protocol)) return null;
 if(!['axstore.in','www.axstore.in',...domains].includes(url.hostname)) return url.protocol==='https:'?url.href:null;
 const {pathname,search,hash}=url;
 if(pathname==='/collections/all') return '/products'+search+hash;
 if(pathname==='/search') return '/products'+(search || '?search=1')+hash;
 const handle=pathname.match(/^\/pages\/([^/]+)\/?$/)?.[1];
 if(handle && pageRoutes[handle]) {const target=new URL(pageRoutes[handle],'https://axstore.in');return target.pathname+search+(target.hash || hash);}
 return pathname+search+hash;
}
export function normalizeMenu(menu,fallback,domains=[]) {
 if(!menu) return fallback;
 function visit(items) {return (items || []).flatMap(item=>{
  const href=normalizeMenuUrl(item.url,domains),children=visit(item.items);
  if(!href && !children.length) return [];
  return [{key:item.id,label:item.title,href:href || children[0].href,items:children}];
 });}
 return visit(menu.items);
}
export const hasUnresolvedTemplate = html => /\{\{|\{%/.test(html || '');
