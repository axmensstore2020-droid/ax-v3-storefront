import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesCategory,matchesStyle,matchesSearch} from '../lib/navigation.js';
import {isStoreProduct,validateCartInput,findVariant} from '../lib/commerce.js';
import {fallbackProducts,formatMoney} from '../lib/catalog.js';
test('shirts and tees stay separate, and accessories use whole words',()=>{
 assert.equal(matchesCategory({title:'Oversized T-Shirt'},'shirts'),false);
 assert.equal(matchesCategory({title:'Long Sleeve Polo'},'shirts'),false);
 assert.equal(matchesCategory({title:'Long Sleeve Polo'},'t-shirts'),true);
 assert.equal(matchesCategory({title:'Flannel Shirt'},'shirts'),true);
 assert.equal(matchesCategory({title:'Spring Shirt',description:'A classic staple'},'accessories'),false);
});
test('all wardrobe categories match their own products',()=>{
 for(const [category,title] of [['trousers','Wide leg trousers'],['denim','Relaxed jeans'],['outerwear','PU jacket'],['formal','Tailored shirt'],['accessories','Black cap']])assert.equal(matchesCategory({title},category),true);
});
test('new-in collection aliases open the catalog fallback',()=>{
 assert.equal(matchesCategory({title:'Black premium linen shirt'},'new-in'),true);
 assert.equal(matchesCategory({title:'Black premium linen shirt'},'new-arrivals'),true);
});
test('empty style edits do not invent stock',()=>{
 assert.equal(fallbackProducts.filter(p=>matchesStyle(p,'linen')).length,0);
 assert.ok(fallbackProducts.filter(p=>matchesStyle(p,'old-school')).length>0);
});
test('search tolerates punctuation and whitespace',()=>{
 assert.equal(matchesSearch({title:'Camouflage Oversized T-Shirt'},'  oversized  t-shirt '),true);
 assert.equal(matchesSearch({title:'Camouflage Oversized T-Shirt'},'formal'),false);
});
test('Partial Payment is filtered on every path',()=>{
 for(const title of ['Partial Payment',' partial payment ','PARTIAL   PAYMENT'])assert.equal(isStoreProduct({title}),false);
 assert.equal(isStoreProduct({title:'Linen shirt'}),true);
});
test('cart rejects malformed IDs and fractional or excessive quantities',()=>{
 const merchandiseId='gid://shopify/ProductVariant/123',cartId='gid://shopify/Cart/abc?key=sample',lineId='gid://shopify/CartLine/abc';
 for(const body of [{action:'create',merchandiseId,quantity:1},{action:'get',cartId},{action:'add',cartId,merchandiseId},{action:'update',cartId,lineId,quantity:0},{action:'remove',cartId,lineId}])assert.equal(validateCartInput(body),null);
 for(const quantity of [-1,0,1.5,100,'1',null])assert.ok(validateCartInput({action:'create',merchandiseId,quantity}));
 for(const body of [null,[],{},{action:'buyNow',merchandiseId,quantity:1},{action:'add',cartId,merchandiseId:'demo'},{action:'get',cartId:3},{action:'remove',cartId,lineId:'test'}])assert.ok(validateCartInput(body));
});
test('variant selection resolves exact combinations and sold-out stock',()=>{
 const variants=[{id:'black-m',availableForSale:true,selectedOptions:[{name:'Color',value:'Black'},{name:'Size',value:'M'}]},{id:'black-l',availableForSale:false,selectedOptions:[{name:'Color',value:'Black'},{name:'Size',value:'L'}]}];
 assert.equal(findVariant(variants,{Color:'Black',Size:'M'}).id,'black-m');
 assert.equal(findVariant(variants,{Color:'Black',Size:'L'}).availableForSale,false);
 assert.equal(findVariant(variants,{Color:'White',Size:'M'}),undefined);
});
test('prices preserve decimals',()=>{
 assert.equal(formatMoney(800,'INR'),'₹800');
 assert.equal(formatMoney(800.5,'INR'),'₹800.50');
});

test('cart batch actions allow a small set of valid Shopify variants only',()=>{
 const cartId='gid://shopify/Cart/abc?key=sample';
 const lines=[
  {merchandiseId:'gid://shopify/ProductVariant/123',quantity:1},
  {merchandiseId:'gid://shopify/ProductVariant/456',quantity:1}
 ];
 assert.equal(validateCartInput({action:'createMany',lines}),null);
 assert.equal(validateCartInput({action:'addMany',cartId,lines}),null);
 assert.ok(validateCartInput({action:'createMany',lines:[]}));
 assert.ok(validateCartInput({action:'createMany',lines:[{merchandiseId:'demo',quantity:1}]}));
 assert.ok(validateCartInput({action:'createMany',lines:Array.from({length:11},(_,i)=>({merchandiseId:'gid://shopify/ProductVariant/'+(100+i),quantity:1}))}));
});
