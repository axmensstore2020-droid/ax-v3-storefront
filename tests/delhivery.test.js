import test from 'node:test';
import assert from 'node:assert/strict';

const {normalizeDelhiveryResponse,normalizeWaybill,trackDelhiveryWaybills}=await import('../lib/delhivery.js');

const payload={ShipmentData:[{Shipment:{
  AWB:'1234567890123',
  Status:{Status:'In Transit',StatusLocation:'Coimbatore Hub',StatusDateTime:'2026-09-16T12:00:00.000Z',StatusCode:'UD'},
  ExpectedDeliveryDate:'2026-09-18T00:00:00.000Z',
  Destination:'Kannur',
  Origin:'Coimbatore',
  Scans:[
    {ScanDetail:{Scan:'In Transit',ScannedLocation:'Coimbatore Hub',ScanDateTime:'2026-09-16T12:00:00.000Z',StatusCode:'UD'}},
    {ScanDetail:{Scan:'Manifested',ScannedLocation:'Coimbatore',ScanDateTime:'2026-09-15T09:00:00.000Z'}}
  ]
}}]};

test('Delhivery response is reduced to customer-safe tracking fields',()=>{
  const result=normalizeDelhiveryResponse(payload)['1234567890123'];
  assert.equal(result.status,'In Transit');
  assert.equal(result.location,'Coimbatore Hub');
  assert.equal(result.expectedDeliveryAt,'2026-09-18T00:00:00.000Z');
  assert.equal(result.scans.length,2);
  assert.equal(result.scans[0].status,'In Transit');
  assert.equal(result.scans[0].location,'Coimbatore Hub');
});

test('waybill input is bounded to safe carrier identifiers',()=>{
  assert.equal(normalizeWaybill(' 1234567890123 '),'1234567890123');
  assert.equal(normalizeWaybill('bad waybill'), '');
  assert.equal(normalizeWaybill('x'), '');
});

test('tracking request keeps token server-side and uses Delhivery production endpoint',async()=>{
  let call=null;
  const result=await trackDelhiveryWaybills(['1234567890123','bad waybill','1234567890123'],{
    env:{DELHIVERY_API_TOKEN:'private-token'},
    fetchImpl:async(url,init)=>{call={url:new URL(url),init};return Response.json(payload);}
  });
  assert.equal(result.configured,true);
  assert.equal(result.shipments['1234567890123'].status,'In Transit');
  assert.equal(call.url.origin,'https://track.delhivery.com');
  assert.equal(call.url.pathname,'/api/v1/packages/json/');
  assert.equal(call.url.searchParams.get('waybill'),'1234567890123');
  assert.equal(call.url.search.includes('private-token'),false);
  assert.equal(call.init.headers.Authorization,'Token private-token');
});

test('missing Delhivery token disables enrichment without making a network request',async()=>{
  let called=false;
  const result=await trackDelhiveryWaybills(['1234567890123'],{env:{},fetchImpl:async()=>{called=true;throw new Error('should not run');}});
  assert.equal(called,false);
  assert.equal(result.configured,false);
  assert.deepEqual(result.shipments,{});
});
