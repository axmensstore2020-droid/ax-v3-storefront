export const MARKETING_CONSENT_COOKIE='ax_marketing_consent';
export const MARKETING_CONSENT_VERSION='v1';
export const MARKETING_GRANTED=`${MARKETING_CONSENT_VERSION}:granted`;
export const MARKETING_DENIED=`${MARKETING_CONSENT_VERSION}:denied`;

export const META_EVENTS=new Set(['PageView','ViewContent','AddToCart','InitiateCheckout']);

export function numericShopifyId(value='') {
 const match=String(value || '').match(/\/(\d+)$/);
 return match?.[1] || String(value || '').replace(/[^0-9]/g,'').slice(-32);
}

export function commerceItemId(product,variant) {
 return numericShopifyId(variant?.id) || numericShopifyId(product?.id) || String(product?.handle || '').slice(0,120);
}

export function productMarketingData(product,variant,quantity=1) {
 const id=commerceItemId(product,variant);
 const amount=Number(variant?.price?.amount ?? product?.price ?? 0);
 const currency=String(variant?.price?.currencyCode || product?.currency || 'INR').toUpperCase();
 const safeQuantity=Math.max(1,Math.min(99,Number(quantity)||1));
 return {
  content_ids:id?[id]:[],
  contents:id?[{id,quantity:safeQuantity,item_price:Number.isFinite(amount)?amount:0}]:[],
  content_type:'product',
  content_name:String(product?.title || '').slice(0,160),
  value:Number.isFinite(amount)?Math.max(0,amount*safeQuantity):0,
  currency:/^[A-Z]{3}$/.test(currency)?currency:'INR',
  num_items:safeQuantity
 };
}

export function checkoutMarketingData(lines=[],subtotal=0,currency='INR') {
 const contents=lines.map(line=>({
  id:numericShopifyId(line.merchandiseId || line.variantId || line.id),
  quantity:Math.max(1,Math.min(99,Number(line.quantity)||1)),
  item_price:Number.isFinite(Number(line.unitPrice))?Math.max(0,Number(line.unitPrice)):undefined
 })).filter(item=>item.id).slice(0,50);
 const value=Number(subtotal);
 const code=String(currency || 'INR').toUpperCase();
 return {
  content_ids:contents.map(item=>item.id),contents,content_type:'product',
  value:Number.isFinite(value)?Math.max(0,value):0,
  currency:/^[A-Z]{3}$/.test(code)?code:'INR',
  num_items:contents.reduce((sum,item)=>sum+item.quantity,0)
 };
}
