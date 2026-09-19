import {getMerchantProducts} from '../../lib/shopify.js';

export const revalidate=900;

const xml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const id=value=>String(value||'').split('/').at(-1)||String(value||'');

function configured(){
  return process.env.AX_LOCAL_INVENTORY_FROM_STOREFRONT==='true' && /^[A-Za-z0-9_-]{1,64}$/.test(String(process.env.GOOGLE_LOCAL_STORE_CODE || ''));
}

function item(product,variant,storeCode){
  const quantity=Math.max(0,Math.floor(Number(variant.quantityAvailable)||0));
  const amount=Number(variant.price?.amount||0),currency=variant.price?.currencyCode||product.currency||'INR';
  return `<item>
<g:store_code>${xml(storeCode)}</g:store_code>
<g:id>${xml(id(variant.id))}</g:id>
<g:quantity>${quantity}</g:quantity>
<g:price>${xml(amount.toFixed(2)+' '+currency)}</g:price>
<g:availability>${quantity>0?'in_stock':'out_of_stock'}</g:availability>
</item>`;
}

export async function GET(){
  if(!configured()) return new Response('Local inventory feed is not configured.',{status:503,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}});
  const storeCode=String(process.env.GOOGLE_LOCAL_STORE_CODE);
  const products=await getMerchantProducts(100);
  const items=products.flatMap(product=>(product.variants||[])
    .filter(variant=>variant?.id && variant?.price?.amount && Number.isFinite(Number(variant.quantityAvailable)))
    .map(variant=>item(product,variant,storeCode))).join('\n');
  const body=`<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel>
<title>AX Men’s Store Local Inventory</title>
${items}
</channel></rss>`;
  return new Response(body,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300, s-maxage=900, stale-while-revalidate=1800'}});
}
