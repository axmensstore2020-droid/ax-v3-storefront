import 'server-only';

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

function normalizeServiceability(payload,pincode) {
  const rows=Array.isArray(payload?.delivery_codes) ? payload.delivery_codes
    : Array.isArray(payload?.deliveryCodes) ? payload.deliveryCodes
    : [];
  for(const row of rows) {
    const postal=row?.postal_code || row?.postalCode || row || {};
    const rowPin=normalizePincode(postal.pin ?? postal.pincode ?? postal.postal_code);
    if(rowPin && rowPin!==pincode) continue;
    const prepaid=text(postal.pre_paid ?? postal.prepaid ?? postal.prePaid).toUpperCase();
    if(['Y','YES','TRUE','1'].includes(prepaid)) return true;
  }
  return false;
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
  if(!token) return {configured:false,amount:null,error:'Delhivery is not configured.'};
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
    if(!response.ok) return {configured:true,amount:null,error:'Delhivery rates are temporarily unavailable.'};
    let payload;
    try { payload=await response.json(); } catch { return {configured:true,amount:null,error:'Delhivery rates are temporarily unavailable.'}; }
    const amount=normalizeShippingAmount(payload);
    return amount==null
      ? {configured:true,amount:null,error:'Delhivery did not return a rate for this service.'}
      : {configured:true,amount,error:''};
  } catch {
    return {configured:true,amount:null,error:'Delhivery rates are temporarily unavailable.'};
  }
}

export async function checkDelhiveryPincode(value,{env=process.env,fetchImpl=fetch}={}) {
  const token=text(env.DELHIVERY_API_TOKEN);
  const pincode=normalizePincode(value);
  if(!token) return {configured:false,serviceable:false,error:'Delhivery is not configured.'};
  if(!pincode) return {configured:true,serviceable:false,error:''};
  const url=new URL(PINCODE_ENDPOINT);
  url.searchParams.set('filter_codes',pincode);
  try {
    const response=await fetchImpl(url,{method:'GET',headers:authHeaders(token),cache:'no-store',signal:safeTimeout()});
    if(!response.ok) return {configured:true,serviceable:false,error:'Delhivery serviceability is temporarily unavailable.'};
    let payload;
    try { payload=await response.json(); } catch { return {configured:true,serviceable:false,error:'Delhivery serviceability is temporarily unavailable.'}; }
    return {configured:true,serviceable:normalizeServiceability(payload,pincode),error:''};
  } catch {
    return {configured:true,serviceable:false,error:'Delhivery serviceability is temporarily unavailable.'};
  }
}

function checkoutFee(env) {
  const raw=env.AX_SHIPPING_ORDER_FEE;
  if(raw==null || text(raw)==='') return 2;
  const fee=Number(raw);
  return Number.isFinite(fee) && fee>=0 && fee<=100 ? Math.round(fee*100)/100 : 2;
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

export async function getDelhiveryCheckoutRates(rateRequest,{env=process.env,fetchImpl=fetch}={}) {
  const token=text(env.DELHIVERY_API_TOKEN);
  if(!token) return {configured:false,rates:[],error:'Delhivery is not configured.'};
  const rate=rateRequest?.rate || rateRequest || {};
  const country=text(rate?.destination?.country).toUpperCase();
  if(country && country!=='IN' && country!=='INDIA') return {configured:true,rates:[],error:''};
  const destinationPincode=normalizePincode(rate?.destination?.postal_code ?? rate?.destination?.postalCode ?? rate?.destination?.zip);
  if(!destinationPincode) return {configured:true,rates:[],error:''};
  const weightGrams=cartWeightGrams(rate?.items);
  if(weightGrams===0) return {configured:true,rates:[],error:''};
  if(weightGrams==null) return {configured:true,rates:[],error:'A shippable item is missing a valid weight.'};
  const originPincode=normalizePincode(env.DELHIVERY_ORIGIN_PIN || '641011');
  if(!originPincode) return {configured:true,rates:[],error:'The pickup pincode is not configured.'};

  const serviceability=await checkDelhiveryPincode(destinationPincode,{env,fetchImpl});
  if(serviceability.error) return {configured:true,rates:[],error:serviceability.error};
  if(!serviceability.serviceable) return {configured:true,rates:[],error:''};

  const [surface,express]=await Promise.all([
    quoteDelhiveryRate({originPincode,destinationPincode,weightGrams,mode:'S'},{env,fetchImpl}),
    quoteDelhiveryRate({originPincode,destinationPincode,weightGrams,mode:'E'},{env,fetchImpl})
  ]);
  const fee=checkoutFee(env);
  const rates=[];
  if(surface.amount!=null) rates.push(carrierRate({
    name:'Standard Delivery',
    code:'AX_DELHIVERY_STANDARD',
    description:'Delhivery Surface',
    amount:surface.amount,
    fee
  }));
  if(express.amount!=null) rates.push(carrierRate({
    name:'Express Delivery',
    code:'AX_DELHIVERY_EXPRESS',
    description:'Delhivery Express',
    amount:express.amount,
    fee
  }));
  if(!rates.length) return {configured:true,rates:[],error:surface.error || express.error || 'Delhivery rates are temporarily unavailable.'};
  return {configured:true,rates,error:''};
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
    if(!response.ok) return {configured:true,shipments:{},error:'Delhivery tracking is temporarily unavailable.'};
    let payload;
    try { payload=await response.json(); } catch { return {configured:true,shipments:{},error:'Delhivery tracking is temporarily unavailable.'}; }
    return {configured:true,shipments:normalizeDelhiveryResponse(payload),error:''};
  } catch {
    return {configured:true,shipments:{},error:'Delhivery tracking is temporarily unavailable.'};
  }
}
