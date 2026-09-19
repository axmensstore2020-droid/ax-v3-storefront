import {getMerchantProducts} from '../../lib/shopify.js';
import {absoluteUrl,SITE_NAME} from '../../lib/seo.js';
import {variantHref} from '../../lib/product-variants.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;

const xml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const option=(variant,pattern)=>(variant.selectedOptions||[]).find(item=>pattern.test(item.name||''))?.value||'';
const id=value=>String(value||'').split('/').at(-1)||String(value||'');
const clean=value=>String(value||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,5000);

function item(product,variant){
 const current=Number(variant.price?.amount||product.price||0),compare=Number(variant.compareAtPrice?.amount||0),sale=Number.isFinite(compare)&&compare>current;
 const currency=variant.price?.currencyCode||product.currency||'INR',color=option(variant,/^colou?r$/i)||product.color||'',size=option(variant,/size/i);
 const image=variant.image?.url||product.image||'',sku=variant.sku||'';
 const suffix=[color,size].filter(Boolean).join(' / '),title=suffix?`${product.title} — ${suffix}`:product.title;
 return `<item>
<title>${xml(title)}</title>
<link>${xml(absoluteUrl(variantHref(product.handle,variant.id)))}</link>
<description>${xml(clean(product.description||product.title))}</description>
<g:id>${xml(id(variant.id))}</g:id>
<g:item_group_id>${xml(id(product.id))}</g:item_group_id>
<g:image_link>${xml(image)}</g:image_link>
<g:availability>${variant.availableForSale?'in_stock':'out_of_stock'}</g:availability>
<g:condition>new</g:condition>
<g:brand>${xml(SITE_NAME)}</g:brand>
<g:price>${xml((sale?compare:current).toFixed(2)+' '+currency)}</g:price>
${sale?`<g:sale_price>${xml(current.toFixed(2)+' '+currency)}</g:sale_price>`:''}
<g:gender>male</g:gender>
<g:age_group>adult</g:age_group>
${color?`<g:color>${xml(color)}</g:color>`:''}
${size?`<g:size>${xml(size)}</g:size>`:''}
${product.fabric?`<g:material>${xml(product.fabric)}</g:material>`:''}
${product.type?`<g:product_type>${xml(product.type)}</g:product_type>`:''}
${sku?`<g:mpn>${xml(sku)}</g:mpn>`:'<g:identifier_exists>no</g:identifier_exists>'}
</item>`;
}

export async function GET(){
 let products;
 try { products=await getMerchantProducts(100); }
 catch { return new Response('Merchant feed is temporarily unavailable.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Retry-After':'300','X-Robots-Tag':'noindex'}}); }
 const items=products.flatMap(product=>(product.variants||[]).filter(variant=>variant?.id&&variant?.price?.amount&&(variant.image?.url||product.image)).map(variant=>item(product,variant))).join('\n');
 const body=`<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel>
<title>${xml(SITE_NAME)} Product Feed</title>
<link>${xml(absoluteUrl('/'))}</link>
<description>Live Shopify catalog for Google Merchant Center.</description>
${items}
</channel></rss>`;
 return new Response(body,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=1800, stale-while-revalidate=3600','X-Robots-Tag':'noindex'}});
}
