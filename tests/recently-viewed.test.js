import test from 'node:test';
import assert from 'node:assert/strict';
import {addRecentlyViewed,normalizeRecentlyViewed,RECENTLY_VIEWED_LIMIT} from '../lib/recently-viewed.js';

test('recently viewed handles are normalized, deduplicated and bounded',()=>{
  const input=[' Jacket-One ','jacket-one','bad handle','tee-two',...Array.from({length:12},(_,index)=>'piece-'+index)];
  const result=normalizeRecentlyViewed(input);
  assert.equal(result[0],'jacket-one');
  assert.equal(result[1],'tee-two');
  assert.equal(result.length,RECENTLY_VIEWED_LIMIT);
  assert.equal(new Set(result).size,result.length);
});

test('newly viewed product moves to the front without duplication',()=>{
  const result=addRecentlyViewed(['tee-one','shirt-two','jacket-three'],'shirt-two');
  assert.deepEqual(result,['shirt-two','tee-one','jacket-three']);
});

test('invalid product handles never enter recently viewed history',()=>{
  assert.deepEqual(addRecentlyViewed(['tee-one'],'../../admin'),['tee-one']);
});
