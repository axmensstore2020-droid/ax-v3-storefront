import test from 'node:test';
import assert from 'node:assert/strict';
import {partialCodAdvance,partialCodBreakdown,partialCodHandlingFee} from '../lib/partial-cod.js';

test('Partial COD advance is exactly 20 percent of final order value',()=>{
 assert.equal(partialCodAdvance(749),149.8);
 assert.equal(partialCodAdvance(1249),249.8);
 assert.equal(partialCodAdvance(1299),259.8);
 assert.equal(partialCodAdvance(1999),399.8);
 assert.equal(partialCodAdvance(3499),699.8);
});

test('Partial COD advance never exceeds the order total',()=>{
 assert.equal(partialCodAdvance(0.01),0);
 assert.equal(partialCodAdvance(0.05),0.01);
});

test('Partial COD balance is exact to paise',()=>{
 assert.deepEqual(partialCodBreakdown(1299),{orderTotal:1299,advance:259.8,codBalance:1039.2});
 assert.deepEqual(partialCodBreakdown(3499),{orderTotal:3499,advance:699.8,codBalance:2799.2});
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
