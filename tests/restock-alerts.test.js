import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRestockEmail,normalizeRestockHandle,normalizeRestockVariantId,restockVariantLabel,soldOutVariantForProduct} from '../lib/restock-alerts.js';

test('restock signup normalizes safe email, handle and Shopify variant IDs',()=>{
  assert.equal(normalizeRestockEmail(' Customer@Example.COM '),'customer@example.com');
  assert.equal(normalizeRestockEmail('not-an-email'),'');
  assert.equal(normalizeRestockHandle(' Racing-Jacket '),'racing-jacket');
  assert.equal(normalizeRestockHandle('../../admin'),'');
  assert.equal(normalizeRestockVariantId('gid://shopify/ProductVariant/12345'),'gid://shopify/ProductVariant/12345');
  assert.equal(normalizeRestockVariantId('12345'),'');
});

test('restock alert is eligible only for the exact sold-out real variant',()=>{
  const sold={id:'gid://shopify/ProductVariant/1',availableForSale:false,selectedOptions:[{name:'Colour',value:'Black'},{name:'Size',value:'M'}]};
  const live={id:'gid://shopify/ProductVariant/2',availableForSale:true,selectedOptions:[{name:'Colour',value:'Black'},{name:'Size',value:'L'}]};
  const product={handle:'jacket',variants:[sold,live],demo:false};
  assert.equal(soldOutVariantForProduct(product,sold.id),sold);
  assert.equal(soldOutVariantForProduct(product,live.id),null);
  assert.equal(soldOutVariantForProduct({...product,demo:true},sold.id),null);
  assert.equal(restockVariantLabel(sold),'Colour: Black · Size: M');
});
