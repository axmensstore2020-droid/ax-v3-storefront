import 'server-only';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {sealEncryptedToken,unsealEncryptedToken} from './sealed-token.js';
import {storefront,shopifyConfigured} from './shopify.js';
import {cartOperations} from './shopify-queries.js';
import {weightToGrams} from './weight.js';
import {partialCodBreakdown} from './partial-cod.js';
import {createDelhiveryCodShipment,estimateDelhiveryCodDelivery,findDelhiveryShipmentByOrderId} from './delhivery.js';

const FIND_ORDER_QUERY=`query FindPartialCodOrder($query:String!){
  orders(first:1,query:$query,sortKey:CREATED_AT,reverse:true){
    nodes{
      id name sourceIdentifier displayFinancialStatus
      totalPriceSet{shopMoney{amount currencyCode}}
      totalOutstandingSet{shopMoney{amount currencyCode}}
    }
  }
}`;

const CREATE_ORDER_MUTATION=`mutation CreatePartialCodOrder($order:OrderCreateOrderInput!,$options:OrderCreateOptionsInput){
  orderCreate(order:$order,options:$options){
    userErrors{field message}
    order{
      id name sourceIdentifier displayFinancialStatus
      totalPriceSet{shopMoney{amount currencyCode}}
      totalOutstandingSet{shopMoney{amount currencyCode}}
    }
  }
}`;

const money=value=>Math.round(Number(value)*100)/100;
const text=(value,max=240)=>String(value ?? '').trim().replace(/\s+/g,' ').slice(0,max);
const validCartId=value=>typeof value==='string' && value.startsWith('gid://shopify/Cart/') && value.length>24 && value.length<=1024 && !/\s/.test(value) && ![...value].some(ch=>ch.charCodeAt(0)<32);
let shopifyAdminTokenCache={key:'',token:'',expiresAt:0};

export function partialCodConfig(env=process.env) {
  const domain=text(env.SHOPIFY_STORE_DOMAIN,180).toLowerCase();
  const keyId=text(env.RAZORPAY_KEY_ID,120),keySecret=text(env.RAZORPAY_KEY_SECRET,240);
  const adminToken=text(env.SHOPIFY_ADMIN_ACCESS_TOKEN,320);
  const adminClientId=text(env.SHOPIFY_CLIENT_ID,180),adminClientSecret=String(env.SHOPIFY_CLIENT_SECRET || '').trim();
  const adminAuthReady=Boolean(adminToken || (adminClientId && adminClientSecret));
  const sessionSecret=String(env.AX_PARTIAL_COD_SECRET || '');
  const enabled=String(env.AX_PARTIAL_COD_ENABLED || '').toLowerCase()==='true';
  const apiVersion=text(env.SHOPIFY_API_VERSION || '2026-07',20);
  const delhiveryReady=Boolean(text(env.DELHIVERY_API_TOKEN,320) && text(env.DELHIVERY_CLIENT_NAME,140) && text(env.DELHIVERY_PICKUP_LOCATION,140));
  return {
    enabled,domain,keyId,keySecret,adminToken,adminClientId,adminClientSecret,adminAuthReady,sessionSecret,apiVersion,delhiveryReady,
    testMode:keyId.startsWith('rzp_test_'),
    ready:Boolean(enabled && /^[a-z0-9-]+\.myshopify\.com$/.test(domain) && keyId && keySecret && adminAuthReady && sessionSecret.length>=32 && delhiveryReady && shopifyConfigured())
  };
}

export const partialCodConfigured=env=>partialCodConfig(env).ready;

function cartSnapshot(cart) {
  const rawLines=cart?.lines?.nodes || [];
  if(!rawLines.length) throw new Error('Your bag is empty.');
  const lines=[];let weightGrams=0,quantity=0;
  for(const line of rawLines) {
    const variant=line?.merchandise,qty=Number(line?.quantity);
    if(!variant?.id || !/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(variant.id) || !Number.isInteger(qty) || qty<1 || qty>99) throw new Error('Your bag contains an invalid item.');
    const requiresShipping=variant.requiresShipping!==false;
    const grams=requiresShipping?weightToGrams(variant.weight,variant.weightUnit):0;
    if(requiresShipping && !grams) throw new Error(`${variant.product?.title || 'An item'} is missing a shipping weight. Add its weight in Shopify before using Partial COD.`);
    if(requiresShipping) weightGrams+=grams*qty;
    quantity+=qty;
    lines.push({
      variantId:variant.id,quantity:qty,title:text(variant.product?.title || variant.title,120),
      variantTitle:text(variant.title,120),sku:text(variant.sku,100),requiresShipping,weightGrams:grams || 0
    });
  }
  const subtotal=money(cart?.cost?.subtotalAmount?.amount),baseTotal=money(cart?.cost?.totalAmount?.amount);
  const currency=text(cart?.cost?.totalAmount?.currencyCode || cart?.cost?.subtotalAmount?.currencyCode,3).toUpperCase();
  if(currency!=='INR' || !Number.isFinite(subtotal) || subtotal<=0 || !Number.isFinite(baseTotal) || baseTotal<=0) throw new Error('Partial COD currently supports INR orders only.');
  if(weightGrams<=0) throw new Error('Partial COD requires at least one shippable item.');
  return {cartId:cart.id,lines,subtotal,baseTotal,currency,weightGrams,quantity};
}

export async function loadPartialCodCart(cartId) {
  if(!validCartId(cartId)) throw new Error('This bag has expired. Please reopen your bag.');
  const data=await storefront(cartOperations.get,{id:cartId},{revalidate:0});
  if(!data?.cart) throw new Error('This bag has expired. Please add your items again.');
  return cartSnapshot(data.cart);
}

export async function quotePartialCod(cartId,pincode,{env=process.env}={}) {
  const config=partialCodConfig(env);
  if(!config.ready) throw new Error('Partial COD is not available yet.');
  const pin=String(pincode || '').replace(/\D/g,'');
  if(!/^\d{6}$/.test(pin)) throw new Error('Enter a valid 6-digit delivery pincode.');
  const cart=await loadPartialCodCart(cartId);
  const estimate=await estimateDelhiveryCodDelivery({destinationPincode:pin,weightGrams:cart.weightGrams,subtotal:cart.subtotal},{env});
  if(!estimate.configured) throw new Error('COD delivery is not configured yet.');
  if(estimate.error && !estimate.serviceable) throw new Error(estimate.error);
  if(!estimate.codServiceable || !estimate.serviceable) throw new Error('Cash on Delivery is not available for this pincode through our delivery partner.');
  if(estimate.needsWeight) throw new Error('One or more items are missing a shipping weight.');
  if(!estimate.rates?.length) throw new Error(estimate.error || 'Our delivery partner did not return a COD delivery option.');
  const rates=estimate.rates.map(rate=>{
    const orderTotal=money(cart.baseTotal+Number(rate.amount||0)),breakdown=partialCodBreakdown(orderTotal);
    return {...rate,orderTotal,...breakdown};
  });
  return {cart,pincode:pin,location:estimate.location||{},rates,estimatedDelivery:estimate.estimatedDelivery||null};
}

function normalizePhone(value) {
  let digits=String(value || '').replace(/\D/g,'');
  if(digits.length===12 && digits.startsWith('91')) digits=digits.slice(2);
  if(digits.length===11 && digits.startsWith('0')) digits=digits.slice(1);
  if(!/^[6-9]\d{9}$/.test(digits)) return null;
  return {digits,e164:'+91'+digits};
}

export function validatePartialCodCustomer(value,pincode,location={}) {
  const input=value && typeof value==='object'?value:{};
  const firstName=text(input.firstName,60),lastName=text(input.lastName,60),email=text(input.email,160).toLowerCase();
  const phone=normalizePhone(input.phone),address1=text(input.address1,160),address2=text(input.address2,120),city=text(input.city,80);
  if(firstName.length<2) throw new Error('Enter your first name.');
  if(!lastName) throw new Error('Enter your last name.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if(!phone) throw new Error('Enter a valid 10-digit Indian mobile number.');
  if(address1.length<5) throw new Error('Enter your full delivery address.');
  if(city.length<2) throw new Error('Enter your city.');
  const provinceCode=/^[A-Z]{2,3}$/.test(String(location?.stateCode||'').toUpperCase())?String(location.stateCode).toUpperCase():undefined;
  const shippingAddress={firstName,lastName,address1,address2:address2||undefined,city,countryCode:'IN',zip:pincode,phone:phone.e164,...(provinceCode?{provinceCode}:{})};
  return {firstName,lastName,name:`${firstName} ${lastName}`,email,phone:phone.e164,phoneDigits:phone.digits,address1,address2,city,shippingAddress};
}


export function sealPartialCodSession(value,secret){return sealEncryptedToken(value,secret,'pc1');}

export function unsealPartialCodSession(token,secret){
  if(!secret || secret.length<32)return null;
  return unsealEncryptedToken(token,secret,{
    prefix:'pc1',minLength:30,maxLength:24000,
    validate:value=>value?.kind==='partial-cod' && Number(value.exp)>Date.now()
  });
}

function razorpayAuth(config){return 'Basic '+Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');}

async function razorpayJson(path,{method='GET',body,config,fetchImpl=fetch}={}) {
  const response=await fetchImpl('https://api.razorpay.com/v1/'+path,{
    method,headers:{Accept:'application/json',Authorization:razorpayAuth(config),...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(10000)
  });
  let data;try {data=await response.json();} catch {data=null;}
  if(!response.ok || !data) throw new Error('Razorpay is temporarily unavailable.');
  return data;
}

async function createRazorpayOrder(amountPaise,cartId,config) {
  const receipt=('AXPCOD-'+Date.now().toString(36)+'-'+randomBytes(4).toString('hex')).slice(0,40);
  const cartDigest=createHash('sha256').update(cartId).digest('hex').slice(0,20);
  const order=await razorpayJson('orders',{method:'POST',config,body:{amount:amountPaise,currency:'INR',receipt,notes:{purpose:'AX Partial COD',cart:cartDigest}}});
  if(!/^order_[A-Za-z0-9]+$/.test(order.id || '') || Number(order.amount)!==amountPaise || order.currency!=='INR') throw new Error('Razorpay returned an invalid payment order.');
  return order;
}

export function verifyRazorpaySignature({orderId,paymentId,signature},secret) {
  if(!/^order_[A-Za-z0-9]+$/.test(orderId||'') || !/^pay_[A-Za-z0-9]+$/.test(paymentId||'') || !/^[a-f0-9]{64}$/i.test(signature||'')) return false;
  const expected=createHmac('sha256',secret).update(`${orderId}|${paymentId}`).digest('hex');
  try {return timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(signature,'hex'));} catch {return false;}
}

async function fetchVerifiedPayment(paymentId,session,config) {
  const payment=await razorpayJson('payments/'+encodeURIComponent(paymentId),{config});
  if(payment.id!==paymentId || payment.order_id!==session.razorpayOrderId || Number(payment.amount)!==session.advancePaise || payment.currency!=='INR') throw new Error('The booking advance could not be verified.');
  if(payment.status!=='captured' && payment.captured!==true) throw new Error('The booking advance is not captured yet. Please retry in a moment.');
  return payment;
}

function resetShopifyAdminTokenCache() {
  shopifyAdminTokenCache={key:'',token:'',expiresAt:0};
}

function shopifyAdminTokenCacheKey(config) {
  return createHash('sha256').update([config.domain,config.adminClientId,config.adminClientSecret].join('\0')).digest('hex');
}

export async function getShopifyAdminAccessToken(config,{fetchImpl=fetch,now=Date.now()}={}) {
  if(config.adminToken) return config.adminToken;
  if(!config.adminClientId || !config.adminClientSecret) throw new Error('Shopify Admin API credentials are not configured.');

  const cacheKey=shopifyAdminTokenCacheKey(config);
  if(shopifyAdminTokenCache.key===cacheKey && shopifyAdminTokenCache.token && now<shopifyAdminTokenCache.expiresAt-60_000) {
    return shopifyAdminTokenCache.token;
  }

  const response=await fetchImpl(`https://${config.domain}/admin/oauth/access_token`,{
    method:'POST',
    headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({
      grant_type:'client_credentials',
      client_id:config.adminClientId,
      client_secret:config.adminClientSecret
    }).toString(),
    cache:'no-store',
    signal:AbortSignal.timeout(10000)
  });
  let data;try {data=await response.json();} catch {data=null;}
  const token=text(data?.access_token,320),expiresIn=Number(data?.expires_in);
  if(!response.ok || token.length<20 || !Number.isFinite(expiresIn) || expiresIn<60) {
    throw new Error('Shopify Admin API authentication failed.');
  }
  shopifyAdminTokenCache={
    key:cacheKey,
    token,
    expiresAt:now+Math.min(expiresIn,86400)*1000
  };
  return token;
}

async function adminGraphql(query,variables,config,fetchImpl=fetch) {
  const request=async()=>{
    const accessToken=await getShopifyAdminAccessToken(config,{fetchImpl});
    return fetchImpl(`https://${config.domain}/admin/api/${config.apiVersion}/graphql.json`,{
      method:'POST',headers:{Accept:'application/json','Content-Type':'application/json','X-Shopify-Access-Token':accessToken},
      body:JSON.stringify({query,variables}),cache:'no-store',signal:AbortSignal.timeout(12000)
    });
  };
  let response=await request();
  if(response.status===401 && !config.adminToken) {
    resetShopifyAdminTokenCache();
    response=await request();
  }
  let json;try {json=await response.json();} catch {json=null;}
  if(!response.ok || !json || json.errors?.length) throw new Error('Shopify could not create the Partial COD order.');
  return json.data;
}

async function findShopifyPartialCodOrder(paymentId,config) {
  const query='source_identifier:"'+paymentId.replace(/"/g,'')+'"';
  const data=await adminGraphql(FIND_ORDER_QUERY,{query},config);
  return data?.orders?.nodes?.find(order=>order?.sourceIdentifier===paymentId) || null;
}

function shopifyMoney(amount){return {shopMoney:{amount:money(amount).toFixed(2),currencyCode:'INR'}};}

async function createShopifyPartialCodOrder(session,payment,config) {
  const customer=session.customer,address=customer.shippingAddress,rate=session.rate;
  const orderInput={
    currency:'INR',email:customer.email,phone:customer.phone,
    sourceIdentifier:payment.id,
    lineItems:session.cart.lines.map(line=>({variantId:line.variantId,quantity:line.quantity})),
    shippingAddress:address,billingAddress:address,
    shippingLines:[{title:rate.code==='express'?'Express Delivery + COD handling':'Standard Delivery + COD handling',code:rate.code==='express'?'AX_DELHIVERY_EXPRESS':'AX_DELHIVERY_STANDARD',source:'Delhivery',priceSet:shopifyMoney(rate.amount)}],
    financialStatus:'PARTIALLY_PAID',
    transactions:[{
      kind:'SALE',status:'SUCCESS',gateway:'Razorpay',authorizationCode:payment.id,
      amountSet:shopifyMoney(session.advance),test:config.testMode,
      receiptJson:{razorpay_payment_id:payment.id,razorpay_order_id:session.razorpayOrderId,purpose:'partial_cod_advance'}
    }],
    tags:['partial-cod','ax-v3'],
    note:`Partial COD · Razorpay advance ₹${session.advance.toFixed(2)} · COD handling ₹${Number(rate.codHandlingFee||0).toFixed(2)} · planned COD balance ₹${session.codBalance.toFixed(2)}.`,
    test:config.testMode
  };
  const data=await adminGraphql(CREATE_ORDER_MUTATION,{order:orderInput,options:{inventoryBehaviour:'DECREMENT_OBEYING_POLICY',sendReceipt:true}},config);
  const result=data?.orderCreate;
  if(result?.userErrors?.length) throw new Error(result.userErrors.map(error=>error.message).join(' '));
  if(!result?.order?.id) throw new Error('Shopify did not create the order.');
  return result.order;
}

function orderMoney(order,key) {
  const value=order?.[key]?.shopMoney;
  if(value?.currencyCode!=='INR') throw new Error('The Shopify order currency is invalid.');
  const amount=money(value?.amount);
  if(!Number.isFinite(amount)) throw new Error('The Shopify order total is invalid.');
  return amount;
}

function delhiveryOrderReference(paymentId) {
  return ('AXPCOD-'+String(paymentId||'').replace(/[^A-Za-z0-9]/g,'')).slice(0,60);
}

export function shouldBookLiveDelhivery(config) {
  return !config?.testMode;
}

async function ensureDelhiveryShipment(order,session,paymentId,{env=process.env}={}) {
  const orderReference=delhiveryOrderReference(paymentId);
  const existing=await findDelhiveryShipmentByOrderId(orderReference,{env});
  if(existing.shipment?.waybill) return existing.shipment.waybill;

  const total=orderMoney(order,'totalPriceSet'),codBalance=orderMoney(order,'totalOutstandingSet');
  if(codBalance<=0 || codBalance>total) throw new Error('The Shopify COD balance is invalid.');
  const customer=session.customer;
  const address=[customer.address1,customer.address2].filter(Boolean).join(', ');
  const productsDescription=session.cart.lines.map(line=>line.title).filter(Boolean).join(', ').slice(0,220) || 'Apparel';
  const created=await createDelhiveryCodShipment({
    orderReference,name:customer.name,phone:customer.phoneDigits,address,pincode:session.pincode,
    city:customer.city,state:session.location?.stateCode || '',orderTotal:total,codAmount:codBalance,
    weightGrams:session.cart.weightGrams,quantity:session.cart.quantity,productsDescription,shippingCode:session.rate.code
  },{env});
  if(created.waybill) return created.waybill;
  const recovery=await findDelhiveryShipmentByOrderId(orderReference,{env});
  if(recovery.shipment?.waybill) return recovery.shipment.waybill;
  throw new Error(created.error || 'The order was created, but Delhivery shipment booking needs attention.');
}

export async function preparePartialCod({cartId,pincode,shippingCode,customer},{env=process.env}={}) {
  const config=partialCodConfig(env);
  if(!config.ready) throw new Error('Partial COD is not available yet.');
  const quote=await quotePartialCod(cartId,pincode,{env});
  const rate=quote.rates.find(item=>item.code===shippingCode);
  if(!rate) throw new Error('Choose a valid delivery method.');
  const normalizedCustomer=validatePartialCodCustomer(customer,quote.pincode,quote.location);
  const advancePaise=Math.round(rate.advance*100);
  const razorpayOrder=await createRazorpayOrder(advancePaise,cartId,config);
  const session={
    kind:'partial-cod',exp:Date.now()+30*60*1000,razorpayOrderId:razorpayOrder.id,advancePaise,
    pincode:quote.pincode,location:quote.location,cart:quote.cart,rate:{
      code:rate.code,label:rate.label,amount:money(rate.amount),
      shippingAmount:money(rate.shippingAmount||0),codHandlingFee:money(rate.codHandlingFee||0),currency:'INR'
    },
    orderTotal:money(rate.orderTotal),advance:money(rate.advance),codBalance:money(rate.codBalance),
    customer:normalizedCustomer
  };
  return {
    keyId:config.keyId,orderId:razorpayOrder.id,amountPaise:advancePaise,currency:'INR',
    orderTotal:session.orderTotal,advance:session.advance,codBalance:session.codBalance,
    session:sealPartialCodSession(session,config.sessionSecret)
  };
}

export async function confirmPartialCod({sessionToken,razorpayOrderId,razorpayPaymentId,razorpaySignature},{env=process.env}={}) {
  const config=partialCodConfig(env);
  if(!config.ready) throw new Error('Partial COD is not available yet.');
  const session=unsealPartialCodSession(sessionToken,config.sessionSecret);
  if(!session || session.razorpayOrderId!==razorpayOrderId) throw new Error('This Partial COD session has expired. Please contact AX if payment was already made.');
  if(!verifyRazorpaySignature({orderId:razorpayOrderId,paymentId:razorpayPaymentId,signature:razorpaySignature},config.keySecret)) throw new Error('The Razorpay payment signature is invalid.');
  const payment=await fetchVerifiedPayment(razorpayPaymentId,session,config);

  let order=await findShopifyPartialCodOrder(payment.id,config);
  if(!order) order=await createShopifyPartialCodOrder(session,payment,config);

  let waybill=null,deliveryBooking='test-skipped';
  if(shouldBookLiveDelhivery(config)) {
    waybill=await ensureDelhiveryShipment(order,session,payment.id,{env});
    deliveryBooking='booked';
  }

  return {
    orderId:order.id,orderName:order.name,financialStatus:order.displayFinancialStatus,
    orderTotal:orderMoney(order,'totalPriceSet'),codBalance:orderMoney(order,'totalOutstandingSet'),
    advance:session.advance,waybill,deliveryBooking
  };
}
