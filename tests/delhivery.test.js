import test from 'node:test';
import assert from 'node:assert/strict';

const {cartWeightGrams,getDelhiveryCheckoutRates,normalizeDelhiveryResponse,normalizePincode,normalizeShippingAmount,normalizeWaybill,quoteDelhiveryRate,trackDelhiveryWaybills}=await import('../lib/delhivery.js');

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


test('shipping inputs use six digit pincodes and packed variant weights',()=>{
  assert.equal(normalizePincode(' 400001 '),'400001');
  assert.equal(normalizePincode('40001'),'');
  assert.equal(cartWeightGrams([
    {grams:350,quantity:1,requires_shipping:true},
    {grams:650,quantity:2,requires_shipping:true},
    {grams:0,quantity:1,requires_shipping:false}
  ]),1650);
  assert.equal(cartWeightGrams([{grams:0,quantity:1,requires_shipping:true}]),null);
  assert.equal(normalizeShippingAmount([{total_amount:'68.52'}]),68.52);
});

test('Delhivery quote uses production cost endpoint and prepaid shipment inputs',async()=>{
  let call=null;
  const result=await quoteDelhiveryRate({
    originPincode:'641011',
    destinationPincode:'400001',
    weightGrams:1000,
    mode:'E'
  },{
    env:{DELHIVERY_API_TOKEN:'private-token'},
    fetchImpl:async(url,init)=>{
      call={url:new URL(url),init};
      return Response.json([{total_amount:178.68}]);
    }
  });
  assert.equal(result.amount,178.68);
  assert.equal(call.url.origin,'https://track.delhivery.com');
  assert.equal(call.url.pathname,'/api/kinko/v1/invoice/charges/.json');
  assert.equal(call.url.searchParams.get('md'),'E');
  assert.equal(call.url.searchParams.get('cgm'),'1000');
  assert.equal(call.url.searchParams.get('o_pin'),'641011');
  assert.equal(call.url.searchParams.get('d_pin'),'400001');
  assert.equal(call.url.searchParams.get('ss'),'Delivered');
  assert.equal(call.url.searchParams.get('pt'),'Pre-paid');
  assert.equal(call.init.headers.Authorization,'Token private-token');
});

test('checkout returns Standard and Express from live Delhivery totals plus the configured order fee',async()=>{
  const calls=[];
  const result=await getDelhiveryCheckoutRates({
    rate:{
      destination:{country:'IN',postal_code:'400001'},
      items:[{grams:500,quantity:1,requires_shipping:true}]
    }
  },{
    env:{
      DELHIVERY_API_TOKEN:'private-token',
      DELHIVERY_ORIGIN_PIN:'641011',
      AX_SHIPPING_ORDER_FEE:'3'
    },
    fetchImpl:async url=>{
      const parsed=new URL(url);
      calls.push(parsed);
      if(parsed.pathname==='/c/api/pin-codes/json/') {
        return Response.json({delivery_codes:[{postal_code:{pin:400001,pre_paid:'Y'}}]});
      }
      const mode=parsed.searchParams.get('md');
      return Response.json([{total_amount:mode==='S'?68.52:94.14}]);
    }
  });
  assert.equal(result.error,'');
  assert.deepEqual(result.rates,[
    {
      service_name:'Standard Delivery',
      service_code:'AX_DELHIVERY_STANDARD',
      total_price:'7152',
      description:'Delhivery Surface',
      currency:'INR'
    },
    {
      service_name:'Express Delivery',
      service_code:'AX_DELHIVERY_EXPRESS',
      total_price:'9714',
      description:'Delhivery Express',
      currency:'INR'
    }
  ]);
  assert.equal(calls.length,3);
});

test('non-serviceable prepaid pincode returns no checkout rates',async()=>{
  let calls=0;
  const result=await getDelhiveryCheckoutRates({
    rate:{
      destination:{country:'IN',postal_code:'744101'},
      items:[{grams:500,quantity:1,requires_shipping:true}]
    }
  },{
    env:{DELHIVERY_API_TOKEN:'private-token',DELHIVERY_ORIGIN_PIN:'641011'},
    fetchImpl:async()=>{calls+=1;return Response.json({delivery_codes:[{postal_code:{pin:744101,pre_paid:'N'}}]});}
  });
  assert.equal(result.error,'');
  assert.deepEqual(result.rates,[]);
  assert.equal(calls,1);
});

test('missing packed product weight fails closed before calling Delhivery',async()=>{
  let called=false;
  const result=await getDelhiveryCheckoutRates({
    rate:{
      destination:{country:'IN',postal_code:'600001'},
      items:[{grams:0,quantity:1,requires_shipping:true}]
    }
  },{
    env:{DELHIVERY_API_TOKEN:'private-token'},
    fetchImpl:async()=>{called=true;throw new Error('should not run');}
  });
  assert.equal(called,false);
  assert.match(result.error,/weight/i);
  assert.deepEqual(result.rates,[]);
});
