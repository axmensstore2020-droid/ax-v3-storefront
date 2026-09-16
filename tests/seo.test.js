import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanDescription,collectionJsonLd,pageMetadata,productJsonLd} from '../lib/seo.js';

test('SEO descriptions are plain text and bounded',()=>{
 const value=cleanDescription('<p>Premium <strong>linen</strong> shirt</p> '.repeat(20));
 assert.equal(value.includes('<'),false);
 assert.ok(value.length<=160);
 assert.match(value,/Premium linen shirt/);
});

test('product structured data uses live variants and availability',()=>{
 const data=productJsonLd({
  handle:'premium-linen-shirt',title:'Premium Linen Shirt',description:'Breathable linen shirt.',
  productNumberDisplay:'AX-101',type:'Shirts',color:'White',fabric:'Linen',images:[{url:'https://cdn.example.com/shirt.jpg'}],
  variants:[
   {id:'gid://shopify/ProductVariant/1',sku:'AX-101-S',availableForSale:true,price:{amount:'1999.00',currencyCode:'INR'}},
   {id:'gid://shopify/ProductVariant/2',sku:'AX-101-M',availableForSale:false,price:{amount:'1999.00',currencyCode:'INR'}}
  ]
 });
 assert.equal(data['@type'],'Product');
 assert.equal(data.sku,'AX-101');
 assert.equal(data.material,'Linen');
 assert.equal(data.offers.length,2);
 assert.equal(data.offers[0].availability,'https://schema.org/InStock');
 assert.equal(data.offers[1].availability,'https://schema.org/OutOfStock');
 assert.equal(new URL(data.url).pathname,'/products/premium-linen-shirt');
});

test('collection structured data links products in order',()=>{
 const data=collectionJsonLd({handle:'linen',title:'Linen',products:[{handle:'shirt-one',title:'Shirt One'},{handle:'shirt-two',title:'Shirt Two'}]});
 assert.equal(data['@type'],'ItemList');
 assert.equal(data.itemListElement.length,2);
 assert.equal(data.itemListElement[0].position,1);
 assert.equal(new URL(data.itemListElement[1].url).pathname,'/products/shirt-two');
});

test('page metadata exposes one canonical URL',()=>{
 const metadata=pageMetadata({title:'Linen Shirts',description:'Shop linen shirts.',path:'/collections/linen'});
 assert.equal(metadata.alternates.canonical,'/collections/linen');
 assert.equal(metadata.openGraph.url,'/collections/linen');
});
