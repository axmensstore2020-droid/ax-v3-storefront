import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanDescription,collectionJsonLd,jsonLd,pageMetadata,productGroupJsonLd,productJsonLd,websiteJsonLd} from '../lib/seo.js';

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

test('apparel variants emit ProductGroup with size, colour and measurements',()=>{
 const data=productGroupJsonLd({
  id:'gid://shopify/Product/10',handle:'relaxed-sweatpants',title:'Relaxed Sweatpants',description:'Relaxed everyday sweatpants.',
  productNumberDisplay:'AX-210',type:'Sweatpants',fabric:'Cotton blend',fit:'Relaxed fit',measurementUnit:'cm',
  sizeMeasurements:{S:{waist:68,length:100,thigh:30},M:{waist:72,length:102,thigh:31}},
  options:[{name:'Size',values:['S','M']},{name:'Colour',values:['Black','Green']}],
  images:[{url:'https://cdn.example.com/pants.jpg'}],
  variants:[
   {id:'gid://shopify/ProductVariant/11',sku:'AX-210-S-BLK',availableForSale:true,price:{amount:'1000.00',currencyCode:'INR'},selectedOptions:[{name:'Size',value:'S'},{name:'Colour',value:'Black'}]},
   {id:'gid://shopify/ProductVariant/12',sku:'AX-210-M-GRN',availableForSale:false,price:{amount:'1000.00',currencyCode:'INR'},selectedOptions:[{name:'Size',value:'M'},{name:'Colour',value:'Green'}]}
  ]
 });
 assert.equal(data['@type'],'ProductGroup');
 assert.equal(data.productGroupID,'AX-210');
 assert.deepEqual(data.variesBy,['https://schema.org/size','https://schema.org/color']);
 assert.equal(data.hasVariant.length,2);
 assert.equal(data.hasVariant[0].size,'S');
 assert.equal(data.hasVariant[0].color,'Black');
 assert.equal(data.hasVariant[0].offers.availability,'https://schema.org/InStock');
 assert.equal(new URL(data.hasVariant[0].url).searchParams.get('variant'),'11');
 assert.ok(data.hasVariant[0].additionalProperty.some(property=>property.name==='Waist' && property.value==='68 cm'));
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

test('website entity links back to the AX organization',()=>{
 const data=websiteJsonLd();
 assert.equal(data['@type'],'WebSite');
 assert.match(data.publisher['@id'],/#organization$/);
 assert.equal(data.inLanguage,'en-IN');
});

test('aggregate review schema appears only with genuine rating and count data',()=>{
 const rated=productJsonLd({handle:'rated-shirt',title:'Rated Shirt',reviewRating:4.7,reviewCount:18,price:999,currency:'INR',availableForSale:true});
 assert.deepEqual(rated.aggregateRating,{'@type':'AggregateRating',ratingValue:'4.7',reviewCount:'18',bestRating:'5',worstRating:'1'});
 const unrated=productJsonLd({handle:'new-shirt',title:'New Shirt',price:999,currency:'INR',availableForSale:true});
 assert.equal('aggregateRating' in unrated,false);
});

test('JSON-LD serialization cannot break out of its script element',()=>{
 const serialized=jsonLd({name:'</script><script>alert(1)</script>'});
 assert.equal(serialized.includes('</script>'),false);
 assert.match(serialized,/\\u003c\/script>/);
});
