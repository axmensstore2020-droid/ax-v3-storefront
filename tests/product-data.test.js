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
