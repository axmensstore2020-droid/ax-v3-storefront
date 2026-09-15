import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {navigation,styleWorlds,seasonalCollections} from '../lib/navigation.js';
import {setTimeout as delay} from 'node:timers/promises';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3008','-H','127.0.0.1'],{stdio:['ignore','pipe','pipe'],env:{...process.env,SHOPIFY_STOREFRONT_PRIVATE_TOKEN:'',SHOPIFY_STOREFRONT_ACCESS_TOKEN:'',AX_ALLOW_INDEXING:'false'}});
let logs='';server.stdout.on('data',data=>logs+=data);server.stderr.on('data',data=>logs+=data);
try{
 let ready=false;
 for(let i=0;i<60;i++){try{const response=await fetch('http://127.0.0.1:3008/');if(response.ok){ready=true;break;}}catch{}await delay(200);}
 assert.ok(ready,'Server failed to start: '+logs);
 const routes=[...new Set(['/','/products','/products?style=linen','/products?q=polo','/collections','/collections/denim','/collections/outerwear','/collections/formal','/products/men-s-premium-long-sleeve-polo-t-shirt-smart-casual-wear','/help','/contact','/stores','/policies','/about','/careers','/faqs','/ax-stylist',...[...navigation,...styleWorlds,...seasonalCollections].map(item=>item.href)])];
 for(const route of routes){
  const response=await fetch('http://127.0.0.1:3008'+route),html=await response.text();
  assert.equal(response.status,200,route);assert.match(html,/<title>/,route);assert.match(html,/noindex, nofollow/,route);assert.ok(!html.includes('SHOPIFY_STOREFRONT_PRIVATE_TOKEN'),route);
  assert.equal((html.match(/<main[ >]/g)||[]).length,1,route);console.log('PASS',route);
 }
 assert.equal((await fetch('http://127.0.0.1:3008/products/not-a-real-product')).status,404);
 for(const [body,status] of [['{',400],[JSON.stringify({action:'create',merchandiseId:'gid://shopify/ProductVariant/123'}),503],[JSON.stringify({action:'add',cartId:'invalid'}),400]]){
  const response=await fetch('http://127.0.0.1:3008/api/cart',{method:'POST',headers:{'Content-Type':'application/json'},body});
  assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'no-store');
 }
 console.log('PASS missing product and malformed/unconnected cart requests');
}finally{server.kill('SIGTERM');}
