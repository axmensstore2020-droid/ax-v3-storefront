import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWishlist,toggleWishlistValue,WISHLIST_LIMIT,wishlistHas} from '../lib/wishlist.js';

test('wishlist normalizes, deduplicates and bounds product handles',()=>{
  const input=[' Jacket-One ','jacket-one','bad handle','tee-two',...Array.from({length:60},(_,index)=>'piece-'+index)];
  const result=normalizeWishlist(input);
  assert.equal(result[0],'jacket-one');
  assert.equal(result[1],'tee-two');
  assert.equal(result.length,WISHLIST_LIMIT);
  assert.equal(new Set(result).size,result.length);
});

test('wishlist toggle adds a new item to the front and removes an existing item',()=>{
  const added=toggleWishlistValue(['tee-one','shirt-two'],'jacket-three');
  assert.deepEqual(added.slice(0,3),['jacket-three','tee-one','shirt-two']);
  assert.deepEqual(toggleWishlistValue(added,'tee-one'),['jacket-three','shirt-two']);
});

test('wishlist rejects malformed handles and reports membership safely',()=>{
  assert.deepEqual(toggleWishlistValue(['tee-one'],'../../admin'),['tee-one']);
  assert.equal(wishlistHas(['tee-one'],'tee-one'),true);
  assert.equal(wishlistHas(['tee-one'],'TEE-ONE'),true);
  assert.equal(wishlistHas(['tee-one'],'shirt-two'),false);
});
