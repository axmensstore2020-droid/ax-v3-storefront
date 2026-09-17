import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('account order status stays inside the AX storefront',async()=>{
  const source=await readFile(new URL('../app/account/page.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/statusPageUrl/);
  assert.ok(source.includes('href={`#${orderTrackingId(order)}`}'));
  assert.ok(source.includes('id={orderTrackingId(order)}'));
  assert.ok(source.includes('ORDER STATUS ↓'));
});
