import test from 'node:test';
import assert from 'node:assert/strict';
import {deliveryWeightForProduct,variantWeightGrams,weightToGrams} from '../lib/weight.js';

test('Shopify variant weight units convert safely to grams',()=>{
 assert.equal(weightToGrams(404,'GRAMS'),404);
 assert.equal(weightToGrams(0.65,'KILOGRAMS'),650);
 assert.equal(weightToGrams(1,'POUNDS'),454);
 assert.equal(weightToGrams(10,'OUNCES'),283);
 assert.equal(weightToGrams(0,'GRAMS'),null);
 assert.equal(weightToGrams(1,'UNKNOWN'),null);
 assert.equal(variantWeightGrams({weight:404,weightUnit:'GRAMS',requiresShipping:true}),404);
 assert.equal(variantWeightGrams({requiresShipping:false}),0);
});


test('PDP delivery weight falls back to an available variant before size selection',()=>{
 const product={variants:[
  {id:'black-m',availableForSale:true,weight:404,weightUnit:'GRAMS',requiresShipping:true,selectedOptions:[{name:'Colour',value:'Black'},{name:'Size',value:'M'}]},
  {id:'black-l',availableForSale:true,weight:410,weightUnit:'GRAMS',requiresShipping:true,selectedOptions:[{name:'Colour',value:'Black'},{name:'Size',value:'L'}]},
  {id:'white-m',availableForSale:true,weight:390,weightUnit:'GRAMS',requiresShipping:true,selectedOptions:[{name:'Colour',value:'White'},{name:'Size',value:'M'}]}
 ]};
 assert.equal(deliveryWeightForProduct(product,{Colour:'Black'}),410);
 assert.equal(deliveryWeightForProduct(product,{Colour:'White'}),390);
 assert.equal(deliveryWeightForProduct(product,{Colour:'Black',Size:'M'},product.variants[0]),404);
});
