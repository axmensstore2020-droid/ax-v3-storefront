import test from 'node:test';
import assert from 'node:assert/strict';
import {checkoutMarketingData,productMarketingData} from '../lib/marketing.js';
import {metaCapiConfigured,metaPixelId,normalizeMetaEvent} from '../lib/meta.js';

test('product marketing data uses a catalog-friendly numeric variant id',()=>{
 const product={id:'gid://shopify/Product/100',handle:'linen-shirt',title:'Linen Shirt',price:1499,currency:'INR'};
 const variant={id:'gid://shopify/ProductVariant/200',price:{amount:'1499.00',currencyCode:'INR'}};
 const data=productMarketingData(product,variant,1);
 assert.deepEqual(data.content_ids,['200']);
 assert.equal(data.value,1499);
 assert.equal(data.currency,'INR');
 assert.deepEqual(data.contents,[{id:'200',quantity:1,item_price:1499}]);
});

test('checkout data includes only commerce identifiers and totals',()=>{
 const data=checkoutMarketingData([
  {merchandiseId:'gid://shopify/ProductVariant/200',quantity:2,unitPrice:1499},
  {merchandiseId:'gid://shopify/ProductVariant/300',quantity:1,unitPrice:999}
 ],3997,'INR');
 assert.deepEqual(data.content_ids,['200','300']);
 assert.equal(data.num_items,3);
 assert.equal(data.value,3997);
 assert.equal('email' in data,false);
 assert.equal('phone' in data,false);
});

test('server event normalizer allowlists commerce fields and rejects off-site sources',()=>{
 const previous=process.env.AX_SITE_ORIGIN;process.env.AX_SITE_ORIGIN='https://axstore.in';
 try{
  const event=normalizeMetaEvent({eventName:'AddToCart',eventId:'12345678-abcd',eventSourceUrl:'https://axstore.in/products/linen-shirt',customData:{content_ids:['200'],contents:[{id:'200',quantity:1,item_price:1499}],value:1499,currency:'inr',content_type:'product',email:'customer@example.com',measurements:{chest:100}}});
  assert.equal(event.customData.currency,'INR');
  assert.deepEqual(event.customData.content_ids,['200']);
  assert.equal('email' in event.customData,false);
  assert.equal('measurements' in event.customData,false);
  assert.throws(()=>normalizeMetaEvent({eventName:'Purchase',eventId:'12345678-abcd',eventSourceUrl:'https://axstore.in'}),/Unsupported/);
  assert.throws(()=>normalizeMetaEvent({eventName:'PageView',eventId:'12345678-abcd',eventSourceUrl:'https://competitor.example/'}),/source/);
 } finally {if(previous===undefined)delete process.env.AX_SITE_ORIGIN;else process.env.AX_SITE_ORIGIN=previous;}
});

test('CAPI is disabled until pixel, token and explicit Graph API version are configured',()=>{
 const keys=['META_PIXEL_ID','META_CAPI_ACCESS_TOKEN','META_GRAPH_API_VERSION'];
 const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 try{
  process.env.META_PIXEL_ID='123456789';delete process.env.META_CAPI_ACCESS_TOKEN;delete process.env.META_GRAPH_API_VERSION;
  assert.equal(metaPixelId(),'123456789');assert.equal(metaCapiConfigured(),false);
  process.env.META_CAPI_ACCESS_TOKEN='server-only-token';process.env.META_GRAPH_API_VERSION='v99.0';
  assert.equal(metaCapiConfigured(),true);
 } finally {for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
});
