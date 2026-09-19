import test from 'node:test';
import assert from 'node:assert/strict';
import {partialCodAdvance,partialCodBreakdown,partialCodHandlingFee} from '../lib/partial-cod.js';

test('Partial COD advance is greater of ₹100 or rounded 10 percent',()=>{
 assert.equal(partialCodAdvance(749),100);
 assert.equal(partialCodAdvance(1249),120);
 assert.equal(partialCodAdvance(1299),130);
 assert.equal(partialCodAdvance(1999),200);
 assert.equal(partialCodAdvance(3499),350);
});

test('Partial COD advance never exceeds the order total',()=>{
 assert.equal(partialCodAdvance(99),99);
 assert.deepEqual(partialCodBreakdown(99),{orderTotal:99,advance:99,codBalance:0});
});

test('Partial COD balance is exact after rounding',()=>{
 assert.deepEqual(partialCodBreakdown(1299),{orderTotal:1299,advance:130,codBalance:1169});
 assert.deepEqual(partialCodBreakdown(3499),{orderTotal:3499,advance:350,codBalance:3149});
});

test('invalid Partial COD totals fail closed',()=>{
 assert.deepEqual(partialCodBreakdown(0),{orderTotal:0,advance:0,codBalance:0});
 assert.deepEqual(partialCodBreakdown('bad'),{orderTotal:0,advance:0,codBalance:0});
});


test('Partial COD handling is ₹40 minimum or 2 percent of product value',()=>{
 assert.equal(partialCodHandlingFee(749),40);
 assert.equal(partialCodHandlingFee(1999),40);
 assert.equal(partialCodHandlingFee(2000),40);
 assert.equal(partialCodHandlingFee(2499),49.98);
 assert.equal(partialCodHandlingFee(3499),69.98);
 assert.equal(partialCodHandlingFee(0),0);
});
