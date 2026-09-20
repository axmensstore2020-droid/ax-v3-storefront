import test from 'node:test';
import assert from 'node:assert/strict';

const {productCareInstructions}=await import('../lib/product-care.js');

test('merchant-entered care instructions remain the source of truth',()=>{
  assert.equal(
    productCareInstructions({care:'Dry clean only.',fabric:'Cotton'}),
    'Dry clean only.'
  );
});

test('French terry and cotton products get safe wash guidance when care is missing',()=>{
  assert.match(
    productCareInstructions({fabric:'75% French terry, 25% cotton'}),
    /machine wash cold/i
  );
});

test('leather products do not get machine-wash guidance',()=>{
  const care=productCareInstructions({fabric:'Leather'});
  assert.match(care,/wipe clean/i);
  assert.doesNotMatch(care,/machine wash cold/i);
});

test('chains and accessories never get garment washing instructions',()=>{
  const care=productCareInstructions({type:'Chain / Accessories',fabric:'Stainless steel'});
  assert.equal(care,'Store dry and avoid prolonged contact with water, perfume and chemicals.');
  assert.doesNotMatch(care,/wash|bleach|garment/i);
});
