import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionQuery,productsQuery} from '../lib/shopify-queries.js';
process.env.SHOPIFY_STORE_DOMAIN='sample-test.myshopify.com';
process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN='test-only-private';
process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN='test-only-public';
const live=await import('../lib/shopify.js');
const realFetch=globalThis.fetch;
const sample={id:'gid://shopify/Product/1',handle:'real-shirt',title:'Real Linen Shirt',productType:'Shirt',description:'Linen shirt',tags:['Linen'],availableForSale:true,featuredImage:{url:'https://cdn.shopify.com/real.jpg'},priceRange:{minVariantPrice:{amount:'1000',currencyCode:'INR'}}};
test('PDP fetch carries a processed Shopify video through product normalization', async t => {
 t.after(()=>{globalThis.fetch=realFetch;});
 const media={id:'video-1',mediaContentType:'VIDEO',alt:'Model video',previewImage:{url:'https://cdn.shopify.com/poster.jpg'},sources:[{url:'https://cdn.shopify.com/model.mp4',mimeType:'video/mp4',height:720}]};
 globalThis.fetch=async(url,init)=>{
  const query=JSON.parse(init.body).query;
  if(query.includes('query Product(')) assert.match(query,/media\(first:100\)/);
  return Response.json({data:{product:{...sample,images:{nodes:[{url:sample.featuredImage.url}]},variants:{nodes:[]},metafields:[],media:{nodes:[media]}}}});
 };
 const product=await live.getProduct(sample.handle);
 assert.equal(product.videos[0].sources[0].url,media.sources[0].url);
 assert.equal(product.images[0].url,sample.featuredImage.url);
});
test('private header takes precedence and carts are never cached',async t=>{
 t.after(()=>{globalThis.fetch=realFetch;});
 let options;
 globalThis.fetch=async(url,init)=>{options=init;assert.ok(url.startsWith('https://sample-test.myshopify.com/'));return Response.json({data:{ok:true}});};
 await live.storefront('query Test { shop { name } }',{}, {revalidate:0,buyerIp:'192.0.2.1'});
 assert.equal(options.headers['Shopify-Storefront-Private-Token'],'test-only-private');
 assert.equal(options.headers['X-Shopify-Storefront-Access-Token'],undefined);
 assert.equal(options.headers['Shopify-Storefront-Buyer-IP'],'192.0.2.1');
 assert.equal(options.cache,'no-store');
 assert.equal(options.next,undefined);
});
test('connected missing collections use current products, never samples',async t=>{
 t.after(()=>{globalThis.fetch=realFetch;});
 globalThis.fetch=async(url,init)=>Response.json({data:JSON.parse(init.body).query.includes('query Collection')?{collection:null}:{products:{nodes:[sample]}}});
 const collection=await live.getCollection('shirts');
 assert.deepEqual(collection.products.map(p=>p.handle),['real-shirt']);
 assert.equal(collection.products[0].demo,false);
});
test('connected empty catalog stays empty; API failures do not fall back',async t=>{
 t.after(()=>{globalThis.fetch=realFetch;});
 globalThis.fetch=async()=>Response.json({data:{products:{nodes:[]}}});
 assert.deepEqual(await live.getProducts(),[]);
 globalThis.fetch=async()=>new Response('Service unavailable',{status:503});
 await assert.rejects(live.getProducts(),/Store unavailable/);
});
test('a merchant-cleared collection is not silently repopulated',async t=>{
 t.after(()=>{globalThis.fetch=realFetch;});
 globalThis.fetch=async(url,init)=>{
  assert.match(JSON.parse(init.body).query,/query Collection/);
  return Response.json({data:{collection:{id:'empty-shirts',title:'Shirts',products:{nodes:[]}}}});
 };
 assert.deepEqual((await live.getCollection('shirts')).products,[]);
});
test('payment helper product is removed from list, collection and detail',async t=>{
 t.after(()=>{globalThis.fetch=realFetch;});
 const payment={...sample,title:' Partial Payment ',handle:'partial-payment'};
 globalThis.fetch=async(url,init)=>{
  const q=JSON.parse(init.body).query;
  return Response.json({data:q.includes('query Products')?{products:{nodes:[sample,payment]}}:q.includes('query Collection')?{collection:{id:'c1',title:'Shirts',products:{nodes:[sample,payment]}}}:{product:payment}});
 };
 assert.equal((await live.getProducts()).length,1);
 assert.equal((await live.getCollection('shirts')).products.length,1);
 assert.equal(await live.getProduct('partial-payment'),null);
});
test('targeted handle lookup does not scan the whole catalog and preserves requested order',async t=>{
 t.after(()=>{globalThis.fetch=realFetch;});
 const second={...sample,id:'gid://shopify/Product/2',handle:'second-shirt',title:'Second Shirt'};
 let request;
 globalThis.fetch=async(url,init)=>{request=JSON.parse(init.body);return Response.json({data:{products:{nodes:[second,sample]}}});};
 const items=await live.getProductsByHandles(['real-shirt','second-shirt']);
 assert.match(request.query,/ProductsByHandles/);
 assert.equal(request.variables.first,2);
 assert.equal(request.variables.query,'handle:real-shirt OR handle:second-shirt');
 assert.deepEqual(items.map(item=>item.handle),['real-shirt','second-shirt']);
});

test('Shopify optionValues maps to variant selector values',async t=>{
 t.after(()=>{globalThis.fetch=realFetch;});
 globalThis.fetch=async()=>Response.json({data:{product:{...sample,images:{nodes:[]},options:[{name:'Size',optionValues:[{name:'M'},{name:'L'}]}],variants:{nodes:[]}}}});
 assert.deepEqual((await live.getProduct('real-shirt')).options,[{name:'Size',values:['M','L']}]);
});

test('PDP still loads when optional inventory quantity scope is unavailable',async t=>{
 t.after(()=>{globalThis.fetch=realFetch;});
 const product={...sample,handle:'inventory-safe-shirt',
  selectedOrFirstAvailableVariant:{id:'gid://shopify/ProductVariant/11',sku:'AX-11',price:{amount:'1000',currencyCode:'INR'},compareAtPrice:null,weight:404,weightUnit:'GRAMS',requiresShipping:true},
  metafields:[{namespace:'ax_data',key:'fit',value:'Relaxed'}],
  images:{nodes:[]},options:[{name:'Size',optionValues:[{name:'M'}]}],
  variants:{nodes:[{id:'gid://shopify/ProductVariant/11',title:'M',sku:'AX-11',availableForSale:true,price:{amount:'1000',currencyCode:'INR'},compareAtPrice:null,weight:404,weightUnit:'GRAMS',requiresShipping:true,selectedOptions:[{name:'Size',value:'M'}],image:null}]}
 };
 let calls=0;
 globalThis.fetch=async(url,init)=>{
  calls++;
  const q=JSON.parse(init.body).query;
  if(q.includes('quantityAvailable')) return Response.json({errors:[{message:'Access denied for quantityAvailable'}]});
  return Response.json({data:{product}});
 };
 const result=await live.getProduct('inventory-safe-shirt');
 assert.equal(calls,2);
 assert.equal(result.handle,'inventory-safe-shirt');
 assert.equal(result.variants[0].availableForSale,true);
 assert.equal(result.variants[0].quantityAvailable,undefined);
 assert.equal(result.variants[0].weight,404);
});

test('PDP uses one Shopify request when consolidated product data is available',async t=>{
 t.after(()=>{globalThis.fetch=realFetch;});
 const product={...sample,handle:'fast-shirt',
  metafields:[{namespace:'ax_data',key:'fit',value:'Relaxed'}],
  images:{nodes:[]},options:[{name:'Size',optionValues:[{name:'M'}]}],
  variants:{nodes:[{id:'gid://shopify/ProductVariant/12',title:'M',sku:'AX-12',availableForSale:true,quantityAvailable:3,price:{amount:'1000',currencyCode:'INR'},compareAtPrice:null,weight:404,weightUnit:'GRAMS',requiresShipping:true,selectedOptions:[{name:'Size',value:'M'}],image:null}]}
 };
 let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({data:{product}});};
 const result=await live.getProduct('fast-shirt');
 assert.equal(calls,1);
 assert.equal(result.variants[0].quantityAvailable,3);
 assert.equal(result.fit,'Relaxed');
});

test('complete-look products are fetched in one targeted batch',async t=>{
 t.after(()=>{globalThis.fetch=realFetch;});
 const second={...sample,id:'gid://shopify/Product/2',handle:'second-shirt',title:'Second Shirt',variants:{nodes:[]},options:[]};
 let request,calls=0;
 globalThis.fetch=async(url,init)=>{calls++;request=JSON.parse(init.body);return Response.json({data:{products:{nodes:[second,{...sample,variants:{nodes:[]},options:[]}]}}});};
 const items=await live.getCompleteLookProducts(['real-shirt','second-shirt']);
 assert.equal(calls,1);
 assert.match(request.query,/PurchaseProductsByHandles/);
 assert.deepEqual(items.map(item=>item.handle),['real-shirt','second-shirt']);
});


test('catalog queries carry sellable variant combinations for stock-aware filters',()=>{
 assert.ok(productsQuery.includes('variants(first:100){nodes{availableForSale selectedOptions{name value}}}'));
 assert.ok(collectionQuery.includes('variants(first:100){nodes{availableForSale selectedOptions{name value}}}'));
});
