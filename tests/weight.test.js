import test from 'node:test';
import assert from 'node:assert/strict';
import {variantWeightGrams,weightToGrams} from '../lib/weight.js';

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
