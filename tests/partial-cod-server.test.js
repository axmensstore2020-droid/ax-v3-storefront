import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {getShopifyAdminAccessToken,sealPartialCodSession,shouldBookLiveDelhivery,unsealPartialCodSession,validatePartialCodCustomer,verifyRazorpaySignature} from '../lib/partial-cod-server.js';

test('Partial COD customer data is normalized for Indian delivery',()=>{
 const customer=validatePartialCodCustomer({
  firstName:' Muhammed ',lastName:'Nihal',email:'TEST@EXAMPLE.COM',phone:'+91 98765 43210',
  address1:'12 NSR Road',address2:'Near store',city:'Coimbatore'
 },'641011',{stateCode:'TN'});
 assert.equal(customer.email,'test@example.com');
 assert.equal(customer.phone,'+919876543210');
 assert.equal(customer.phoneDigits,'9876543210');
 assert.equal(customer.shippingAddress.countryCode,'IN');
 assert.equal(customer.shippingAddress.provinceCode,'TN');
 assert.equal(customer.shippingAddress.zip,'641011');
});

test('Partial COD rejects invalid phone numbers',()=>{
 assert.throws(()=>validatePartialCodCustomer({
  firstName:'AX',lastName:'Customer',email:'test@example.com',phone:'1234',
  address1:'12 NSR Road',city:'Coimbatore'
 },'641011',{stateCode:'TN'}),/mobile/i);
});

test('Partial COD encrypted session round trips and rejects tampering',()=>{
 const secret='x'.repeat(40),value={kind:'partial-cod',exp:Date.now()+60_000,advance:130};
 const token=sealPartialCodSession(value,secret);
 assert.deepEqual(unsealPartialCodSession(token,secret),value);
 const parts=token.split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);
 const changed=parts.join('.');
 assert.equal(unsealPartialCodSession(changed,secret),null);
 assert.equal(unsealPartialCodSession(token,'y'.repeat(40)),null);
});

test('Razorpay checkout signature is verified with timing-safe HMAC',()=>{
 const secret='razorpay-secret',orderId='order_ABC123',paymentId='pay_XYZ789';
 const signature=createHmac('sha256',secret).update(orderId+'|'+paymentId).digest('hex');
 assert.equal(verifyRazorpaySignature({orderId,paymentId,signature},secret),true);
 assert.equal(verifyRazorpaySignature({orderId,paymentId,signature:'0'.repeat(64)},secret),false);
});


test('Shopify Admin client credentials are exchanged for a short-lived token and cached',async()=>{
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,options});
  return {ok:true,status:200,json:async()=>({access_token:'shpat_test_12345678901234567890',expires_in:86399})};
 };
 const config={
  domain:'axunisexstore.myshopify.com',
  adminToken:'',
  adminClientId:'client-id',
  adminClientSecret:'client-secret'
 };
 const first=await getShopifyAdminAccessToken(config,{fetchImpl,now:1_000});
 const second=await getShopifyAdminAccessToken(config,{fetchImpl,now:2_000});
 assert.equal(first,'shpat_test_12345678901234567890');
 assert.equal(second,first);
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://axunisexstore.myshopify.com/admin/oauth/access_token');
 assert.equal(calls[0].options.headers['Content-Type'],'application/x-www-form-urlencoded');
 const body=new URLSearchParams(calls[0].options.body);
 assert.equal(body.get('grant_type'),'client_credentials');
 assert.equal(body.get('client_id'),'client-id');
 assert.equal(body.get('client_secret'),'client-secret');
});


test('Razorpay test mode never books a live Delhivery shipment',()=>{
 assert.equal(shouldBookLiveDelhivery({testMode:true}),false);
 assert.equal(shouldBookLiveDelhivery({testMode:false}),true);
});
