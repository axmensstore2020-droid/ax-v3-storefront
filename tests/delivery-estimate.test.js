import test from 'node:test';
import assert from 'node:assert/strict';

const {axDispatchDate,buildCustomerDeliveryEstimate}=await import('../lib/delivery-estimate.js');

test('AX dispatches same day before the 10 AM IST cutoff, including Sunday',()=>{
  assert.equal(axDispatchDate(new Date('2026-09-20T03:30:00Z')),'2026-09-20');
});

test('AX dispatches next day at or after the 10 AM IST cutoff',()=>{
  assert.equal(axDispatchDate(new Date('2026-09-20T04:30:00Z')),'2026-09-21');
});

test('Sunday remains a valid dispatch day',()=>{
  assert.equal(axDispatchDate(new Date('2026-09-19T05:00:00Z')),'2026-09-20');
});

test('fallback delivery date uses the conservative maximum when carrier TAT is absent',()=>{
  assert.deepEqual(buildCustomerDeliveryEstimate({
    now:new Date('2026-09-20T03:30:00Z'),
    env:{}
  }),{
    minDays:null,
    maxDays:7,
    source:'ax_fallback',
    dispatchDate:'2026-09-20',
    earliestDate:null,
    latestDate:'2026-09-27'
  });
});

test('carrier TAT keeps its range and produces customer-facing dates',()=>{
  assert.deepEqual(buildCustomerDeliveryEstimate({
    minDays:3,maxDays:5,source:'delhivery',
    now:new Date('2026-09-20T03:30:00Z'),
    env:{}
  }),{
    minDays:3,
    maxDays:5,
    source:'delhivery',
    dispatchDate:'2026-09-20',
    earliestDate:'2026-09-23',
    latestDate:'2026-09-25'
  });
});
