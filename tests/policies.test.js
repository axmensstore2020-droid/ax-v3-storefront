import test from 'node:test';
import assert from 'node:assert/strict';
import {axLegalPolicies} from '../lib/legal-policies.js';

const byKey=Object.fromEntries(axLegalPolicies.map(policy=>[policy.key,policy]));

test('AX storefront carries the complete customer policy set',()=>{
 for(const key of ['refund-policy','shipping-policy','terms-of-service','privacy-policy','terms-of-sale','contact-information']){
  assert.ok(byKey[key]?.body,`missing ${key}`);
 }
});

test('service providers are disclosed inside privacy instead of a standalone policy',()=>{
 assert.equal(byKey['service-providers'],undefined);
 assert.match(byKey['privacy-policy'].body,/Service providers and third-party processing/i);
 assert.match(byKey['privacy-policy'].body,/OpenAI/);
 assert.match(byKey['privacy-policy'].body,/Google Analytics/);
 assert.match(byKey['privacy-policy'].body,/Meta Platforms/);
});

test('AX policies use the confirmed support and NSR fulfilment details',()=>{
 const combined=axLegalPolicies.map(policy=>policy.body).join('\n');
 assert.match(combined,/contact@axstore\.in/);
 assert.match(combined,/@axmensstore/);
 assert.doesNotMatch(combined,/\+91 89030 44818/);
 assert.match(combined,/NSR Rd, Saibaba Colony/);
 assert.match(byKey['contact-information'].body,/Muhammed Nihal AP/);
 assert.match(byKey['contact-information'].body,/48 hours/);
 assert.match(byKey['contact-information'].body,/one month/);
});

test('returns and shipping rules match the current AX operating policy',()=>{
 assert.match(byKey['refund-policy'].body,/7 days/);
 assert.match(byKey['refund-policy'].body,/original payment method/i);
 assert.match(byKey['refund-policy'].body,/not paid in cash/i);
 assert.match(byKey['refund-policy'].body,/International orders.*not eligible for ordinary return or exchange/is);
 assert.match(byKey['shipping-policy'].body,/before 10:00 AM IST/i);
 assert.match(byKey['shipping-policy'].body,/at or after 10:00 AM IST/i);
 assert.match(byKey['shipping-policy'].body,/including Sunday/i);
 assert.match(byKey['shipping-policy'].body,/Standard/);
 assert.match(byKey['shipping-policy'].body,/Express/);
 assert.match(byKey['shipping-policy'].body,/above ₹2,000/);
 assert.match(byKey['shipping-policy'].body,/₹40 or 2% of the product bill value, whichever is higher/i);
 assert.match(byKey['shipping-policy'].body,/20% of the final order value/i);
 assert.match(byKey['shipping-policy'].body,/remaining <strong>80%<\/strong>/i);
 assert.match(byKey['terms-of-sale'].body,/20% of the final order value/i);
 assert.match(byKey['refund-policy'].body,/cannot lawfully be excluded/i);
});
