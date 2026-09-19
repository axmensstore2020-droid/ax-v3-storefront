import test from 'node:test';
import assert from 'node:assert/strict';

const {cartWeightGrams,configuredFreeShippingThreshold,createDelhiveryCodShipment,estimateDelhiveryCodDelivery,estimateDelhiveryDelivery,findDelhiveryShipmentByOrderId,freeShippingEligible,getDelhiveryCheckoutRates,normalizeDelhiveryResponse,normalizePincode,normalizeShippingAmount,normalizeShippingTat,normalizeWaybill,quoteDelhiveryRate,trackDelhiveryWaybills}=await import('../lib/delhivery.js');

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

test('free standard shipping activates at the AX INR 2000 threshold',()=>{
 assert.equal(configuredFreeShippingThreshold(),2000);
 assert.equal(freeShippingEligible({currency:'INR',order_totals:{subtotal_price:200000}}),true);
 assert.equal(freeShippingEligible({currency:'INR',order_totals:{subtotal_price:199999}}),false);
 assert.equal(freeShippingEligible({currency:'USD',order_totals:{subtotal_price:200000}}),false);
});

test('checkout makes standard delivery free at the configured threshold but keeps express paid',async()=>{
 const result=await getDelhiveryCheckoutRates({
  rate:{
   currency:'INR',
   order_totals:{subtotal_price:200000},
   destination:{country:'IN',postal_code:'400001'},
   items:[{grams:500,quantity:1,requires_shipping:true}]
  }
 },{
  env:{DELHIVERY_API_TOKEN:'private-token',DELHIVERY_ORIGIN_PIN:'641011',AX_SHIPPING_ORDER_FEE:'3'},
  fetchImpl:async url=>{
   const parsed=new URL(url);
   if(parsed.pathname==='/c/api/pin-codes/json/') return Response.json({delivery_codes:[{postal_code:{pin:400001,pre_paid:'Y'}}]});
   return Response.json([{total_amount:parsed.searchParams.get('md')==='S'?68.52:94.14}]);
  }
 });
 assert.equal(result.rates[0].service_name,'Free Standard Delivery');
 assert.equal(result.rates[0].total_price,'0');
 assert.equal(result.rates[1].service_name,'Express Delivery');
 assert.equal(result.rates[1].total_price,'9714');
});


test('shipping quote can expose carrier TAT when Delhivery returns it',()=>{
 assert.deepEqual(normalizeShippingTat([{total_amount:90,tat:'3-5 days'}]),{minDays:3,maxDays:5});
 assert.deepEqual(normalizeShippingTat([{total_amount:90,delivery_days:2}]),{minDays:2,maxDays:2});
});

test('delivery estimate returns serviceability details even when weight is not selected',async()=>{
 const result=await estimateDelhiveryDelivery({destinationPincode:'400064',weightGrams:null},{
  env:{DELHIVERY_API_TOKEN:'private-token',DELHIVERY_ORIGIN_PIN:'641011'},
  fetchImpl:async url=>{
   const parsed=new URL(url);
   assert.equal(parsed.pathname,'/c/api/pin-codes/json/');
   return Response.json({delivery_codes:[{postal_code:{pin:400064,pre_paid:'Y',city:'Mumbai',district:'Mumbai',state_code:'MH',is_oda:'N',remarks:''}}]});
  }
 });
 assert.equal(result.serviceable,true);
 assert.equal(result.needsWeight,true);
 assert.equal(result.location.city,'Mumbai');
 assert.equal(result.location.stateCode,'MH');
 assert.deepEqual(result.rates,[]);
 assert.equal(result.estimatedDelivery,null);
});

test('delivery estimate shares serviceability and rate logic used by checkout',async()=>{
 const result=await estimateDelhiveryDelivery({destinationPincode:'400064',weightGrams:500,subtotal:900},{
  env:{DELHIVERY_API_TOKEN:'private-token',DELHIVERY_ORIGIN_PIN:'641011',AX_SHIPPING_ORDER_FEE:'3'},
  fetchImpl:async url=>{
   const parsed=new URL(url);
   if(parsed.pathname==='/c/api/pin-codes/json/') return Response.json({delivery_codes:[{postal_code:{pin:400064,pre_paid:'Y',city:'Mumbai',state_code:'MH'}}]});
   return Response.json([{total_amount:parsed.searchParams.get('md')==='S'?68.52:94.14,tat:parsed.searchParams.get('md')==='S'?'4-6':'2-3'}]);
  }
 });
 assert.equal(result.serviceable,true);
 assert.deepEqual(result.rates,[
  {code:'standard',label:'Standard',amount:71.52,currency:'INR',minDays:4,maxDays:6},
  {code:'express',label:'Express',amount:97.14,currency:'INR',minDays:2,maxDays:3}
 ]);
 assert.deepEqual(result.estimatedDelivery,{minDays:4,maxDays:6,source:'delhivery'});
});


test('serviceable weighted delivery does not invent ETA when Delhivery omits TAT',async()=>{
 const result=await estimateDelhiveryDelivery({destinationPincode:'400064',weightGrams:500,subtotal:900},{
  env:{DELHIVERY_API_TOKEN:'private-token',DELHIVERY_ORIGIN_PIN:'641011',AX_SHIPPING_ORDER_FEE:'3'},
  fetchImpl:async url=>{
   const parsed=new URL(url);
   if(parsed.pathname==='/c/api/pin-codes/json/') return Response.json({delivery_codes:[{postal_code:{pin:400064,pre_paid:'Y',city:'Mumbai',state_code:'MH'}}]});
   return Response.json([{total_amount:parsed.searchParams.get('md')==='S'?68.52:94.14}]);
  }
 });
 assert.equal(result.serviceable,true);
 assert.equal(result.rates.length,2);
 assert.equal(result.estimatedDelivery,null);
});

test('extended delivery areas do not invent ETA when Delhivery omits TAT',async()=>{
 const result=await estimateDelhiveryDelivery({destinationPincode:'744101',weightGrams:null},{
  env:{DELHIVERY_API_TOKEN:'private-token',DELHIVERY_ORIGIN_PIN:'641011'},
  fetchImpl:async()=>Response.json({delivery_codes:[{postal_code:{pin:744101,pre_paid:'Y',city:'Port Blair',state_code:'AN',is_oda:'Y'}}]})
 });
 assert.equal(result.serviceable,true);
 assert.equal(result.estimatedDelivery,null);
});


test('pincode serviceability exposes COD separately from prepaid',async()=>{
 const {checkDelhiveryPincode}=await import('../lib/delhivery.js');
 const result=await checkDelhiveryPincode('400064',{
  env:{DELHIVERY_API_TOKEN:'private-token'},
  fetchImpl:async()=>Response.json({delivery_codes:[{postal_code:{pin:400064,pre_paid:'Y',cod:'N',remarks:''}}]})
 });
 assert.equal(result.serviceable,true);
 assert.equal(result.prepaidServiceable,true);
 assert.equal(result.codServiceable,false);
});


test('Partial COD separates live freight from the disclosed COD handling fee',async()=>{
 const calls=[];
 const result=await estimateDelhiveryCodDelivery({destinationPincode:'400064',weightGrams:500,subtotal:1299},{
  env:{DELHIVERY_API_TOKEN:'private-token',DELHIVERY_ORIGIN_PIN:'641011',AX_SHIPPING_ORDER_FEE:'3'},
  fetchImpl:async url=>{
   const parsed=new URL(url);calls.push(parsed);
   if(parsed.pathname==='/c/api/pin-codes/json/') return Response.json({delivery_codes:[{postal_code:{pin:400064,pre_paid:'Y',cod:'Y',city:'Mumbai',state_code:'MH'}}]});
   assert.equal(parsed.searchParams.get('pt'),'Pre-paid');
   return Response.json([{total_amount:parsed.searchParams.get('md')==='S'?30:60,tat:parsed.searchParams.get('md')==='S'?'4-5':'2-3'}]);
  }
 });
 assert.equal(result.codServiceable,true);
 assert.deepEqual(result.rates[0],{code:'standard',label:'Standard',shippingAmount:33,codHandlingFee:40,amount:73,currency:'INR',minDays:4,maxDays:5});
 assert.deepEqual(result.rates[1],{code:'express',label:'Express',shippingAmount:63,codHandlingFee:40,amount:103,currency:'INR',minDays:2,maxDays:3});
 assert.equal(calls.length,3);
});

test('Partial COD keeps free standard shipping but still charges high-value COD handling',async()=>{
 const result=await estimateDelhiveryCodDelivery({destinationPincode:'400064',weightGrams:500,subtotal:2499},{
  env:{DELHIVERY_API_TOKEN:'private-token',DELHIVERY_ORIGIN_PIN:'641011',AX_SHIPPING_ORDER_FEE:'3'},
  fetchImpl:async url=>{
   const parsed=new URL(url);
   if(parsed.pathname==='/c/api/pin-codes/json/') return Response.json({delivery_codes:[{postal_code:{pin:400064,pre_paid:'Y',cod:'Y'}}]});
   return Response.json([{total_amount:parsed.searchParams.get('md')==='S'?30:60}]);
  }
 });
 assert.equal(result.rates[0].label,'Free Standard shipping');
 assert.equal(result.rates[0].shippingAmount,0);
 assert.equal(result.rates[0].codHandlingFee,49.98);
 assert.equal(result.rates[0].amount,49.98);
 assert.equal(result.rates[1].shippingAmount,63);
 assert.equal(result.rates[1].codHandlingFee,49.98);
 assert.equal(result.rates[1].amount,112.98);
});

test('Partial COD fails closed when Delhivery does not support COD',async()=>{
 let calls=0;
 const result=await estimateDelhiveryCodDelivery({destinationPincode:'400064',weightGrams:500,subtotal:1299},{
  env:{DELHIVERY_API_TOKEN:'private-token'},
  fetchImpl:async()=>{calls+=1;return Response.json({delivery_codes:[{postal_code:{pin:400064,pre_paid:'Y',cod:'N'}}]});}
 });
 assert.equal(result.codServiceable,false);
 assert.deepEqual(result.rates,[]);
 assert.equal(calls,1);
});

test('Delhivery Partial COD shipment sends only the outstanding COD balance',async()=>{
 let request=null;
 const result=await createDelhiveryCodShipment({
  orderReference:'AXPCOD-payABC123',name:'AX Customer',phone:'9876543210',
  address:'12 NSR Road',pincode:'641011',city:'Coimbatore',state:'TN',
  orderTotal:1299,codAmount:1169,weightGrams:404,quantity:1,
  productsDescription:'Racing Jacket',shippingCode:'standard'
 },{
  env:{DELHIVERY_API_TOKEN:'private-token',DELHIVERY_CLIENT_NAME:'AX Store',DELHIVERY_PICKUP_LOCATION:'AX Warehouse'},
  fetchImpl:async(url,init)=>{request={url,init};return Response.json({packages:[{waybill:'1234567890123',status:'Success'}]});}
 });
 assert.equal(result.waybill,'1234567890123');
 assert.equal(request.url,'https://track.delhivery.com/api/cmu/create.json');
 assert.equal(request.init.headers.Authorization,'Token private-token');
 const params=new URLSearchParams(request.init.body),payload=JSON.parse(params.get('data'));
 assert.equal(params.get('format'),'json');
 assert.equal(payload.pickup_location.name,'AX Warehouse');
 assert.equal(payload.shipments[0].payment_mode,'COD');
 assert.equal(payload.shipments[0].cod_amount,1169);
 assert.equal(payload.shipments[0].total_amount,1299);
 assert.equal(payload.shipments[0].order,'AXPCOD-payABC123');
});

test('Delhivery Partial COD retry can recover an existing shipment by order reference',async()=>{
 let calledUrl=null;
 const result=await findDelhiveryShipmentByOrderId('AXPCOD-payABC123',{
  env:{DELHIVERY_API_TOKEN:'private-token'},
  fetchImpl:async url=>{calledUrl=new URL(url);return Response.json(payload);}
 });
 assert.equal(calledUrl.searchParams.get('ref_ids'),'AXPCOD-payABC123');
 assert.equal(result.shipment.waybill,'1234567890123');
});
