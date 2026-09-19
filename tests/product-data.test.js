import test from 'node:test';
import assert from 'node:assert/strict';
import {formatMeasurementValue,normalizeProductData,publicProductNumber,recommendedSizeFromMeasurements} from '../lib/product-data.js';

test('AX metafields become searchable product guidance',()=>{
 const product=normalizeProductData({
  id:'gid://shopify/Product/123',title:'Oxford shirt',tags:[],
  metafields:[
   {namespace:'ax',key:'product_number',value:'AX-SHT-004'},
   {namespace:'ax',key:'fit',value:'Relaxed'},
   {namespace:'ax',key:'fabric',value:'Cotton poplin'},
   {namespace:'ax',key:'measurement_unit',value:'cm'},
   {namespace:'ax',key:'measurements',value:JSON.stringify({S:{chest:'96'},M:{chest:'102'}})},
   {namespace:'ax',key:'size_recommendations',value:JSON.stringify({S:'Recommended for a closer fit',M:'Relaxed fit'})}
  ]
 });
 assert.equal(product.productNumber,'AX-SHT-004');
 assert.equal(product.productNumberDisplay,'AX-SHT-004');
 assert.equal(product.fit,'Relaxed');
 assert.equal(product.measurementUnit,'cm');
 assert.equal(product.sizeFits.S.text,'Recommended for a closer fit');
 assert.equal(product.recommendedSize,'S');
});

test('Shopify minimum-length namespace ax_data is normalized',()=>{
 const product=normalizeProductData({
  id:'gid://shopify/Product/124',title:'Linen shirt',tags:[],
  metafields:[
   {namespace:'ax_data',key:'product_number',value:'AX-SHT-005'},
   {namespace:'ax_data',key:'fit',value:'Relaxed'},
   {namespace:'ax_data',key:'fabric',value:'70% cotton, 30% linen'},
   {namespace:'ax_data',key:'measurement_unit',value:'cm'},
   {namespace:'ax_data',key:'measurements',value:JSON.stringify({S:{chest:104},M:{chest:110}})}
  ]
 });
 assert.equal(product.productNumber,'AX-SHT-005');
 assert.equal(product.fit,'Relaxed');
 assert.equal(product.fabric,'70% cotton, 30% linen');
 assert.equal(product.sizeMeasurements.M.chest,110);
});

test('merchant-friendly body size guide becomes deterministic fit data',()=>{
 const product=normalizeProductData({
  id:'gid://shopify/Product/125',title:'Premium Linen Button-Down Shirt',tags:[],
  metafields:[
   {namespace:'ax_data',key:'measurement_unit',value:'cm'},
   {namespace:'ax_data',key:'measurement_basis',value:'Body measurements'},
   {namespace:'ax_data',key:'size_guide',value:JSON.stringify({S:'91-97 cm chest',M:'99-104 cm chest',L:'107-112 cm chest'})}
  ]
 });
 assert.deepEqual(product.sizeGuide,{version:1,basis:'body_circumference',unit:'cm',sizes:{S:{chest:[91,97]},M:{chest:[99,104]},L:{chest:[107,112]}}});
});

test('product number falls back to variant SKU and tagged fields',()=>{
 assert.equal(publicProductNumber({id:'gid://shopify/Product/123',variants:[{sku:'ax-tee-002-m'}]}),'AX-TEE-002-M');
 assert.equal(normalizeProductData({id:'gid://shopify/Product/9',tags:['AX:Product number=AX-TEE-009']}).productNumber,'AX-TEE-009');
 assert.equal(publicProductNumber({id:'gid://shopify/Product/9'}),'AX-000009');
});

test('measurement checker chooses the smallest size that covers the input',()=>{
 const measurements={S:{chest:'38'},M:{chest:'40'},L:{chest:'42'}};
 assert.equal(recommendedSizeFromMeasurements(measurements,37),'S');
 assert.equal(recommendedSizeFromMeasurements(measurements,40),'M');
 assert.equal(recommendedSizeFromMeasurements(measurements,44),'');
 assert.equal(recommendedSizeFromMeasurements(measurements,'not a measurement'),'');
});

test('measurement values support ranges and arrays',()=>{
 assert.equal(formatMeasurementValue({min:38,max:40}),'38–40');
 assert.equal(formatMeasurementValue(['38','40']),'38–40');
 assert.equal(formatMeasurementValue({value:39}),'39');
});

test('conversion merchandising metafields normalize without inventing proof',()=>{
 const product=normalizeProductData({
  id:'gid://shopify/Product/126',title:'Racing jacket',tags:[],
  metafields:[
   {namespace:'ax_data',key:'model_height',value:'183 cm'},
   {namespace:'ax_data',key:'model_size',value:'L'},
   {namespace:'ax_data',key:'fabric_feel',value:'Smooth structured leather feel'},
   {namespace:'ax_data',key:'style',value:JSON.stringify(['Streetwear','Motorsport'])},
   {namespace:'ax_data',key:'review_rating',value:'4.8'},
   {namespace:'ax_data',key:'review_count',value:'12'},
   {namespace:'ax_data',key:'ugc_images',value:JSON.stringify(['https://cdn.shopify.com/customer-look-1.jpg','not-a-url'])}
  ]
 });
 assert.equal(product.modelHeight,'183 cm');
 assert.equal(product.modelSize,'L');
 assert.equal(product.fabricFeel,'Smooth structured leather feel');
 assert.equal(product.style,'Streetwear, Motorsport');
 assert.equal(product.reviewRating,4.8);
 assert.equal(product.reviewCount,12);
 assert.deepEqual(product.ugcImages,['https://cdn.shopify.com/customer-look-1.jpg']);
 const empty=normalizeProductData({id:'gid://shopify/Product/127',metafields:[]});
 assert.equal(empty.reviewRating,0);
 assert.equal(empty.reviewCount,0);
 assert.deepEqual(empty.ugcImages,[]);
});
