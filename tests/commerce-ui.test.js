import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Buy Now keeps shoppers inside AX and opens the payment-choice state',()=>{
 const purchase=readFileSync(new URL('../components/AddToCart.js',import.meta.url),'utf8');
 const drawer=readFileSync(new URL('../components/CartDrawer.js',import.meta.url),'utf8');
 assert.match(purchase,/openCart\('checkout'\)/);
 assert.doesNotMatch(purchase,/window\.location|checkoutUrl/);
 assert.match(drawer,/checkoutIntent/);
 assert.match(drawer,/choose your payment method/i);
});

test('PDP impossible variants are disabled at the option control',()=>{
 const purchase=readFileSync(new URL('../components/AddToCart.js',import.meta.url),'utf8');
 assert.match(purchase,/disabled=\{busy\|\|!possible\}/);
});
