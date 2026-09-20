import 'server-only';
import {FREE_SHIPPING_THRESHOLD_INR} from './shipping-policy.js';
import {partialCodHandlingFee} from './partial-cod.js';
import {buildCustomerDeliveryEstimate} from './delivery-estimate.js';

const TRACKING_ENDPOINT='https://track.delhivery.com/api/v1/packages/json/';
const SHIPPING_COST_ENDPOINT='https://track.delhivery.com/api/kinko/v1/invoice/charges/.json';
const PINCODE_ENDPOINT='https://track.delhivery.com/c/api/pin-codes/json/';
const MAX_WAYBILLS=50;
const REQUEST_TIMEOUT_MS=6000;

const text=value=>value == null ? '' : String(value).trim();

export function normalizeWaybill(value) {
  const waybill=text(value);
  return /^[A-Za-z0-9-]{6,40}$/.test(waybill) ? waybill : '';
}

export function normalizePincode(value) {
  const pincode=text(value);
  return /^\d{6}$/.test(pincode) ? pincode : '';
}

export function cartWeightGrams(items) {
  if(!Array.isArray(items)) return null;
  let total=0,shippableItems=0;
  for(const item of items) {
    if(item?.requires_shipping===false) continue;
    const quantity=Number(item?.quantity ?? 1);
    const grams=Number(item?.grams);
    if(!Number.isInteger(quantity) || quantity<1 || !Number.isFinite(grams) || grams<=0) return null;
    total+=Math.ceil(grams)*quantity;
    shippableItems+=quantity;
    if(total>100000) return null;
  }
  return shippableItems ? total : 0;
}

function responseRows(payload) {
  if(Array.isArray(payload)) return payload;
  if(!payload || typeof payload!=='object') return [];
  for(const key of ['data','charges','results','response']) if(Array.isArray(payload[key])) return payload[key];
  return [payload];
}

export function normalizeShippingAmount(payload) {
  for(const row of responseRows(payload)) {
    const raw=row?.total_amount ?? row?.totalAmount ?? row?.amount;
    const amount=Number(raw);
    if(Number.isFinite(amount) && amount>0) return Math.round(amount*100)/100;
  }
  return null;
}

export function normalizeShippingTat(payload) {
  for(const row of responseRows(payload)) {
    const raw=row?.tat ?? row?.TAT ?? row?.delivery_days ?? row?.deliveryDays ?? row?.estimated_delivery_days ?? row?.estimatedDeliveryDays ?? row?.transit_days ?? row?.transitDays;
    if(raw==null || raw==='') continue;
    if(Number.isFinite(Number(raw))) {
      const days=Math.ceil(Number(raw));
      if(days>0 && days<=30) return {minDays:days,maxDays:days};
    }
    const match=String(raw).match(/(\d{1,2})(?:\s*(?:-|–|—|to)\s*(\d{1,2}))?/i);
    if(match) {
      const first=Number(match[1]),second=Number(match[2] || match[1]);
      const minDays=Math.min(first,second),maxDays=Math.max(first,second);
      if(minDays>0 && maxDays<=30) return {minDays,maxDays};
    }
  }
  return {minDays:null,maxDays:null};
}

export function normalizeShippingQuote(payload) {
  return {amount:normalizeShippingAmount(payload),...normalizeShippingTat(payload)};
}

function normalizeServiceability(payload,pincode) {
  const rows=Array.isArray(payload?.delivery_codes) ? payload.delivery_codes
    : Array.isArray(payload?.deliveryCodes) ? payload.deliveryCodes
    : [];
  for(const row of rows) {
    const postal=row?.postal_code || row?.postalCode || row || {};
    const rowPin=normalizePincode(postal.pin ?? postal.pincode ?? postal.postal_code);
    if(rowPin && rowPin!==pincode) continue;
    const prepaid=text(postal.pre_paid ?? postal.prepaid ?? postal.prePaid).toUpperCase();
    const cod=text(postal.cod ?? postal.cash_on_delivery ?? postal.cashOnDelivery).toUpperCase();
    const remarks=text(postal.remarks);
    const open=!/embargo/i.test(remarks);
    const prepaidServiceable=['Y','YES','TRUE','1'].includes(prepaid) && open;
    const codServiceable=['Y','YES','TRUE','1'].includes(cod) && open;
    return {
      serviceable:prepaidServiceable,
      prepaidServiceable,
      codServiceable,
      city:text(postal.city),
      district:text(postal.district),
      stateCode:text(postal.state_code ?? postal.stateCode).toUpperCase(),
      isOda:['Y','YES','TRUE','1'].includes(text(postal.is_oda ?? postal.isOda).toUpperCase()),
      remarks
    };
  }
  return {serviceable:false,prepaidServiceable:false,codServiceable:false,city:'',district:'',stateCode:'',isOda:false,remarks:''};
}

function authHeaders(token) {
  return {Accept:'application/json',Authorization:`Token ${token}`,'User-Agent':'AX-Mens-Store/1.0'};
}

function safeTimeout() {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

export async function quoteDelhiveryRate({originPincode,destinationPincode,weightGrams,mode,paymentMode='Pre-paid'},{env=process.env,fetchImpl=fetch}={}) {
  const token=text(env.DELHIVERY_API_TOKEN);
  const origin=normalizePincode(originPincode);
  const destination=normalizePincode(destinationPincode);
  const grams=Math.ceil(Number(weightGrams));
  const billingMode=text(mode).toUpperCase();
  if(!token) return {configured:false,amount:null,error:'Delivery service is not configured.'};
  if(!origin || !destination || !Number.isFinite(grams) || grams<1 || !['S','E'].includes(billingMode)) {
    return {configured:true,amount:null,error:'Invalid Delhivery rate request.'};
  }
  const url=new URL(SHIPPING_COST_ENDPOINT);
  url.searchParams.set('md',billingMode);
  url.searchParams.set('cgm',String(grams));
  url.searchParams.set('o_pin',origin);
  url.searchParams.set('d_pin',destination);
  url.searchParams.set('ss','Delivered');
  url.searchParams.set('pt',paymentMode);
  try {
    const response=await fetchImpl(url,{method:'GET',headers:authHeaders(token),cache:'no-store',signal:safeTimeout()});
    if(!response.ok) return {configured:true,amount:null,error:'Delivery rates are temporarily unavailable.'};
    let payload;
    try { payload=await response.json(); } catch { return {configured:true,amount:null,error:'Delivery rates are temporarily unavailable.'}; }
    const quote=normalizeShippingQuote(payload);
    return quote.amount==null
      ? {configured:true,amount:null,minDays:null,maxDays:null,error:'Our delivery partner did not return a rate for this service.'}
      : {configured:true,...quote,error:''};
  } catch {
    return {configured:true,amount:null,error:'Delivery rates are temporarily unavailable.'};
  }
}

export async function checkDelhiveryPincode(value,{env=process.env,fetchImpl=fetch}={}) {
  const token=text(env.DELHIVERY_API_TOKEN);
  const pincode=normalizePincode(value);
  if(!token) return {configured:false,serviceable:false,error:'Delivery service is not configured.'};
  if(!pincode) return {configured:true,serviceable:false,error:''};
  const url=new URL(PINCODE_ENDPOINT);
  url.searchParams.set('filter_codes',pincode);
  try {
    const response=await fetchImpl(url,{method:'GET',headers:authHeaders(token),cache:'no-store',signal:safeTimeout()});
    if(!response.ok) return {configured:true,serviceable:false,error:'Delivery availability is temporarily unavailable.'};
    let payload;
    try { payload=await response.json(); } catch { return {configured:true,serviceable:false,error:'Delivery availability is temporarily unavailable.'}; }
    return {configured:true,...normalizeServiceability(payload,pincode),error:''};
  } catch {
    return {configured:true,serviceable:false,error:'Delivery availability is temporarily unavailable.'};
  }
}

export function configuredFreeShippingThreshold() {
  return FREE_SHIPPING_THRESHOLD_INR;
}

export function freeShippingEligible(rate,env=process.env) {
  const threshold=configuredFreeShippingThreshold(env);
  if(!threshold) return false;
  const currency=text(rate?.currency || 'INR').toUpperCase();
  const subunits=Number(rate?.order_totals?.subtotal_price);
  return currency==='INR' && Number.isFinite(subunits) && subunits>=Math.round(threshold*100);
}

function checkoutFee(env) {
  const raw=env.AX_SHIPPING_ORDER_FEE;
  if(raw==null || text(raw)==='') return 3;
  const fee=Number(raw);
  return Number.isFinite(fee) && fee>=0 && fee<=100 ? Math.round(fee*100)/100 : 3;
}

function carrierRate({name,code,description,amount,fee}) {
  return {
    service_name:name,
    service_code:code,
    total_price:String(Math.round((amount+fee)*100)),
    description,
    currency:'INR'
  };
}
function storefrontRate({code,label,quote,fee=0,free=false}) {
  return {
    code,label,
    amount:free?0:Math.round((quote.amount+fee)*100)/100,
    currency:'INR',
    minDays:quote.minDays ?? null,
    maxDays:quote.maxDays ?? null
  };
}

function partialCodStorefrontRate({code,label,quote,fee=0,freeShipping=false,codHandlingFee=0}) {
  const shippingAmount=freeShipping?0:Math.round((quote.amount+fee)*100)/100;
  return {
    code,label,
    shippingAmount,
    codHandlingFee:Math.round(codHandlingFee*100)/100,
    amount:Math.round((shippingAmount+codHandlingFee)*100)/100,
    currency:'INR',
    minDays:quote.minDays ?? null,
    maxDays:quote.maxDays ?? null
  };
}
function customerDeliveryEstimate({surface,express,serviceability,env=process.env,now=new Date()}={}) {
  const surfaceAvailable=surface?.amount!=null,expressAvailable=express?.amount!=null;
  const preferred=surfaceAvailable?surface:expressAvailable?express:null;
  const estimate=buildCustomerDeliveryEstimate({
    minDays:preferred?.minDays ?? null,
    maxDays:preferred?.maxDays ?? null,
    isOda:Boolean(serviceability?.isOda),
    source:preferred?.minDays||preferred?.maxDays?'delhivery':'ax_fallback',
    env,now
  });
  return {...estimate,service:surfaceAvailable||!expressAvailable?'standard':'express'};
}

export async function estimateDelhiveryDelivery({destinationPincode,weightGrams,subtotal=0},{env=process.env,fetchImpl=fetch,now=new Date()}={}) {
  const pincode=normalizePincode(destinationPincode);
  if(!pincode) return {configured:Boolean(text(env.DELHIVERY_API_TOKEN)),serviceable:false,pincode:'',rates:[],needsWeight:false,error:'Enter a valid 6-digit pincode.'};
  const serviceability=await checkDelhiveryPincode(pincode,{env,fetchImpl});
  const location={city:serviceability.city||'',district:serviceability.district||'',stateCode:serviceability.stateCode||'',isOda:Boolean(serviceability.isOda)};
  if(!serviceability.configured) return {configured:false,serviceable:false,pincode,location,rates:[],needsWeight:false,error:serviceability.error};
  if(serviceability.error) return {configured:true,serviceable:false,pincode,location,rates:[],needsWeight:false,error:serviceability.error};
  if(!serviceability.serviceable) return {configured:true,serviceable:false,pincode,location,rates:[],needsWeight:false,error:''};

  const grams=Math.ceil(Number(weightGrams));
  if(!Number.isFinite(grams) || grams<1 || grams>100000) {
    return {
      configured:true,serviceable:true,pincode,location,rates:[],needsWeight:true,
      codAvailable:Boolean(serviceability.codServiceable),
      estimatedDelivery:customerDeliveryEstimate({serviceability,env,now}),error:''
    };
  }
  const originPincode=normalizePincode(env.DELHIVERY_ORIGIN_PIN || '641011');
  if(!originPincode) return {configured:true,serviceable:true,pincode,location,rates:[],needsWeight:false,codAvailable:Boolean(serviceability.codServiceable),estimatedDelivery:customerDeliveryEstimate({serviceability,env,now}),error:'The pickup pincode is not configured.'};

  const [surface,express]=await Promise.all([
    quoteDelhiveryRate({originPincode,destinationPincode:pincode,weightGrams:grams,mode:'S'},{env,fetchImpl}),
    quoteDelhiveryRate({originPincode,destinationPincode:pincode,weightGrams:grams,mode:'E'},{env,fetchImpl})
  ]);
  const fee=checkoutFee(env);
  const threshold=configuredFreeShippingThreshold(env);
  const orderSubtotal=Number(subtotal);
  const freeStandard=threshold>0 && Number.isFinite(orderSubtotal) && orderSubtotal>=threshold;
  const rates=[];
  if(surface.amount!=null) rates.push(storefrontRate({code:'standard',label:freeStandard?'Free Standard':'Standard',quote:surface,fee,free:freeStandard}));
  if(express.amount!=null) rates.push(storefrontRate({code:'express',label:'Express',quote:express,fee}));
  return {
    configured:true,serviceable:true,pincode,location,rates,needsWeight:false,
    codAvailable:Boolean(serviceability.codServiceable),
    estimatedDelivery:customerDeliveryEstimate({surface,express,serviceability,env,now}),
    error:rates.length?'':(surface.error || express.error || '')
  };
}


export async function getDelhiveryCheckoutRates(rateRequest,{env=process.env,fetchImpl=fetch}={}) {
  const token=text(env.DELHIVERY_API_TOKEN);
  if(!token) return {configured:false,rates:[],error:'Delivery service is not configured.'};
  const rate=rateRequest?.rate || rateRequest || {};
  const country=text(rate?.destination?.country).toUpperCase();
  if(country && country!=='IN' && country!=='INDIA') return {configured:true,rates:[],error:''};
  const destinationPincode=normalizePincode(rate?.destination?.postal_code ?? rate?.destination?.postalCode ?? rate?.destination?.zip);
  if(!destinationPincode) return {configured:true,rates:[],error:''};
  const weightGrams=cartWeightGrams(rate?.items);
  if(weightGrams===0) return {configured:true,rates:[],error:''};
  if(weightGrams==null) return {configured:true,rates:[],error:'A shippable item is missing a valid weight.'};
  const subunits=Number(rate?.order_totals?.subtotal_price),currency=text(rate?.currency || 'INR').toUpperCase();
  const subtotal=currency==='INR' && Number.isFinite(subunits) ? subunits/100 : 0;
  const estimate=await estimateDelhiveryDelivery({destinationPincode,weightGrams,subtotal},{env,fetchImpl});
  if(estimate.error && !estimate.rates.length) return {configured:estimate.configured,rates:[],error:estimate.error};
  if(!estimate.serviceable) return {configured:true,rates:[],error:''};
  const rates=estimate.rates.map(item=>({
    service_name:item.code==='standard'?(item.amount===0?'Free Standard Delivery':'Standard Delivery'):'Express Delivery',
    service_code:item.code==='standard'?'AX_DELHIVERY_STANDARD':'AX_DELHIVERY_EXPRESS',
    total_price:String(Math.round(item.amount*100)),
    description:item.code==='standard'?(item.amount===0?'Delhivery Surface · Free shipping':'Delhivery Surface'):'Delhivery Express',
    currency:item.currency
  }));
  return {configured:true,rates,error:''};
}


export async function estimateDelhiveryCodDelivery({destinationPincode,weightGrams,subtotal=0},{env=process.env,fetchImpl=fetch}={}) {
  const pincode=normalizePincode(destinationPincode);
  if(!pincode) return {configured:Boolean(text(env.DELHIVERY_API_TOKEN)),serviceable:false,codServiceable:false,pincode:'',rates:[],needsWeight:false,error:'Enter a valid 6-digit pincode.'};
  const serviceability=await checkDelhiveryPincode(pincode,{env,fetchImpl});
  const location={city:serviceability.city||'',district:serviceability.district||'',stateCode:serviceability.stateCode||'',isOda:Boolean(serviceability.isOda)};
  if(!serviceability.configured) return {configured:false,serviceable:false,codServiceable:false,pincode,location,rates:[],needsWeight:false,error:serviceability.error};
  if(serviceability.error) return {configured:true,serviceable:false,codServiceable:false,pincode,location,rates:[],needsWeight:false,error:serviceability.error};
  if(!serviceability.codServiceable) return {configured:true,serviceable:false,codServiceable:false,pincode,location,rates:[],needsWeight:false,error:''};

  const grams=Math.ceil(Number(weightGrams));
  if(!Number.isFinite(grams) || grams<1 || grams>100000) {
    return {configured:true,serviceable:true,codServiceable:true,pincode,location,rates:[],needsWeight:true,estimatedDelivery:null,error:''};
  }
  const originPincode=normalizePincode(env.DELHIVERY_ORIGIN_PIN || '641011');
  if(!originPincode) return {configured:true,serviceable:true,codServiceable:true,pincode,location,rates:[],needsWeight:false,error:'The pickup pincode is not configured.'};

  // Quote freight as prepaid so the carrier's minimum COD overhead is not embedded
  // in the freight value. AX applies the account's COD handling rule explicitly:
  // ₹40 or 2% of product bill value, whichever is higher.
  const [surface,express]=await Promise.all([
    quoteDelhiveryRate({originPincode,destinationPincode:pincode,weightGrams:grams,mode:'S'},{env,fetchImpl}),
    quoteDelhiveryRate({originPincode,destinationPincode:pincode,weightGrams:grams,mode:'E'},{env,fetchImpl})
  ]);
  const fee=checkoutFee(env);
  const threshold=configuredFreeShippingThreshold(env);
  const orderSubtotal=Number(subtotal);
  const codHandlingFee=partialCodHandlingFee(orderSubtotal);
  const freeStandard=threshold>0 && Number.isFinite(orderSubtotal) && orderSubtotal>=threshold;
  const rates=[];
  if(surface.amount!=null) rates.push(partialCodStorefrontRate({code:'standard',label:freeStandard?'Free Standard shipping':'Standard',quote:surface,fee,freeShipping:freeStandard,codHandlingFee}));
  if(express.amount!=null) rates.push(partialCodStorefrontRate({code:'express',label:'Express',quote:express,fee,codHandlingFee}));
  return {
    configured:true,serviceable:true,codServiceable:true,pincode,location,rates,needsWeight:false,
    estimatedDelivery:customerDeliveryEstimate({surface,express}),
    error:rates.length?'':(surface.error || express.error || '')
  };
}

function normalizeOrderReference(value) {
  const ref=text(value).replace(/[^A-Za-z0-9-]/g,'').slice(0,64);
  return ref.length>=6 ? ref : '';
}

export async function findDelhiveryShipmentByOrderId(value,{env=process.env,fetchImpl=fetch}={}) {
  const token=text(env.DELHIVERY_API_TOKEN),refId=normalizeOrderReference(value);
  if(!token || !refId) return {configured:Boolean(token),shipment:null,error:''};
  const url=new URL(TRACKING_ENDPOINT);
  url.searchParams.set('ref_ids',refId);
  try {
    const response=await fetchImpl(url,{method:'GET',headers:authHeaders(token),cache:'no-store',signal:safeTimeout()});
    if(!response.ok) return {configured:true,shipment:null,error:'Delivery tracking is temporarily unavailable.'};
    let payload;try {payload=await response.json();} catch {return {configured:true,shipment:null,error:'Delivery tracking is temporarily unavailable.'};}
    const rows=Array.isArray(payload?.ShipmentData)?payload.ShipmentData:[];
    for(const row of rows) {
      const shipment=normalizeShipment(row);
      if(shipment) return {configured:true,shipment,error:''};
    }
    return {configured:true,shipment:null,error:''};
  } catch {
    return {configured:true,shipment:null,error:'Delivery tracking is temporarily unavailable.'};
  }
}

function safeManifestText(value,max=220) {
  return text(value).replace(/[&%#;\\]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
}

function manifestWaybill(payload) {
  const rows=Array.isArray(payload?.packages)?payload.packages:Array.isArray(payload?.shipments)?payload.shipments:[];
  for(const row of rows) {
    const waybill=normalizeWaybill(row?.waybill || row?.Waybill || row?.awb || row?.AWB);
    const status=text(row?.status || row?.Status).toLowerCase();
    if(waybill && !/fail|error|invalid/.test(status)) return waybill;
  }
  return '';
}

export async function createDelhiveryCodShipment(input,{env=process.env,fetchImpl=fetch}={}) {
  const token=text(env.DELHIVERY_API_TOKEN),client=safeManifestText(env.DELHIVERY_CLIENT_NAME,120),pickup=safeManifestText(env.DELHIVERY_PICKUP_LOCATION,120);
  if(!token || !client || !pickup) return {configured:false,waybill:'',error:'COD shipment creation is not configured.'};
  const order=normalizeOrderReference(input?.orderReference),pin=normalizePincode(input?.pincode);
  const phone=String(input?.phone || '').replace(/\D/g,'').slice(-10);
  const amount=Math.round(Number(input?.orderTotal)*100)/100,codAmount=Math.round(Number(input?.codAmount)*100)/100;
  const weight=Math.ceil(Number(input?.weightGrams)),quantity=Math.max(1,Math.min(999,Math.floor(Number(input?.quantity)||1)));
  const name=safeManifestText(input?.name,120),address=safeManifestText(input?.address,250),city=safeManifestText(input?.city,100),state=safeManifestText(input?.state,100);
  if(!order || !pin || phone.length!==10 || !name || !address || !Number.isFinite(amount) || amount<=0 || !Number.isFinite(codAmount) || codAmount<=0 || codAmount>amount || !Number.isFinite(weight) || weight<1) {
    return {configured:true,waybill:'',error:'The COD shipment details are incomplete.'};
  }
  const shippingCode=input?.shippingCode==='express'?'express':'standard';
  const payload={
    pickup_location:{name:pickup},
    shipments:[{
      name,add:address,pin,city,state,country:'India',phone,
      order,payment_mode:'COD',cod_amount:codAmount,total_amount:amount,
      products_desc:safeManifestText(input?.productsDescription || 'Apparel',250),
      quantity,weight,client,waybill:'',
      shipping_mode:shippingCode==='express'?'Express':'Surface'
    }]
  };
  const body=new URLSearchParams({format:'json',data:JSON.stringify(payload)}).toString();
  try {
    const response=await fetchImpl('https://track.delhivery.com/api/cmu/create.json',{
      method:'POST',headers:{...authHeaders(token),'Content-Type':'application/x-www-form-urlencoded'},body,cache:'no-store',signal:AbortSignal.timeout(10000)
    });
    let result;try {result=await response.json();} catch {result=null;}
    if(!response.ok) return {configured:true,waybill:'',error:'Our delivery partner could not create the COD shipment.'};
    const waybill=manifestWaybill(result);
    if(waybill) return {configured:true,waybill,error:''};
    const remark=safeManifestText(result?.rmk || result?.remark || result?.message || result?.error,240);
    return {configured:true,waybill:'',error:remark || 'Our delivery partner did not return a shipment number.'};
  } catch {
    return {configured:true,waybill:'',error:'Our delivery partner could not create the COD shipment.'};
  }
}

function normalizeScan(value) {
  const scan=value?.ScanDetail || value?.scanDetail || value || {};
  return {
    status:text(scan.Scan || scan.Status || scan.ScanType || scan.status),
    location:text(scan.ScannedLocation || scan.StatusLocation || scan.location),
    happenedAt:text(scan.ScanDateTime || scan.StatusDateTime || scan.happenedAt),
    instructions:text(scan.Instructions || scan.instructions),
    statusCode:text(scan.StatusCode || scan.statusCode)
  };
}

function normalizeShipment(value) {
  const shipment=value?.Shipment || value?.shipment || value || {};
  const status=shipment.Status && typeof shipment.Status==='object' ? shipment.Status : {};
  const waybill=normalizeWaybill(shipment.AWB || shipment.Waybill || shipment.waybill || shipment.TrackingNumber);
  if(!waybill) return null;
  const scans=Array.isArray(shipment.Scans) ? shipment.Scans.map(normalizeScan).filter(scan=>scan.status || scan.happenedAt || scan.location) : [];
  return {
    waybill,
    status:text(status.Status || status.status || shipment.StatusText || shipment.status),
    statusCode:text(status.StatusCode || status.statusCode),
    location:text(status.StatusLocation || status.Location || status.location),
    updatedAt:text(status.StatusDateTime || status.statusDateTime || shipment.LastUpdatedAt),
    expectedDeliveryAt:text(shipment.ExpectedDeliveryDate || shipment.expectedDeliveryDate || shipment.EDD),
    destination:text(shipment.Destination || shipment.destination),
    origin:text(shipment.Origin || shipment.origin),
    scans
  };
}

export function normalizeDelhiveryResponse(payload) {
  const rows=Array.isArray(payload?.ShipmentData) ? payload.ShipmentData : [];
  return Object.fromEntries(rows.map(normalizeShipment).filter(Boolean).map(shipment=>[shipment.waybill,shipment]));
}

export function delhiveryConfigured(env=process.env) {
  return Boolean(text(env.DELHIVERY_API_TOKEN));
}

export async function trackDelhiveryWaybills(values,{env=process.env,fetchImpl=fetch}={}) {
  const token=text(env.DELHIVERY_API_TOKEN);
  const waybills=[...new Set((Array.isArray(values)?values:[]).map(normalizeWaybill).filter(Boolean))].slice(0,MAX_WAYBILLS);
  if(!token || !waybills.length) return {configured:Boolean(token),shipments:{},error:''};
  const url=new URL(TRACKING_ENDPOINT);
  url.searchParams.set('waybill',waybills.join(','));
  url.searchParams.set('ref_ids','');
  try {
    const response=await fetchImpl(url,{method:'GET',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Token ${token}`,'User-Agent':'AX-Mens-Store/1.0'},cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!response.ok) return {configured:true,shipments:{},error:'Delivery tracking is temporarily unavailable.'};
    let payload;
    try { payload=await response.json(); } catch { return {configured:true,shipments:{},error:'Delivery tracking is temporarily unavailable.'}; }
    return {configured:true,shipments:normalizeDelhiveryResponse(payload),error:''};
  } catch {
    return {configured:true,shipments:{},error:'Delivery tracking is temporarily unavailable.'};
  }
}
