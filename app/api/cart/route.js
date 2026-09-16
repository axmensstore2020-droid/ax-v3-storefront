import {NextResponse} from 'next/server';
import {isIP} from 'node:net';
import {storefront,shopifyConfigured} from '../../../lib/shopify';
import {cartOperations} from '../../../lib/shopify-queries';
import {validateCartInput} from '../../../lib/commerce';
import {CART_GUARD_COOKIE,readLimitedJson,reserveCartBurst,sameOriginRequest} from '../../../lib/request-security.js';

const MAX_CART_BODY_BYTES=8192;
const cartBurstLimit=()=>Math.min(120,Math.max(10,Number(process.env.AX_CART_BURST_LIMIT)||40));

function respond(data,status=200,guard=null,extraHeaders={}) {
 const response=NextResponse.json(data,{status,headers:{
  'Cache-Control':'no-store, private',
  'X-Content-Type-Options':'nosniff',
  'Cross-Origin-Resource-Policy':'same-origin',
  ...extraHeaders
 }});
 if(guard?.setCookie && guard.token) response.cookies.set(CART_GUARD_COOKIE,guard.token,{
  httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/cart',maxAge:60*60
 });
 return response;
}

export async function POST(request) {
 const origin=process.env.AX_SITE_ORIGIN || (process.env.NODE_ENV!=='production' ? new URL(request.url).origin : '');
 if(!sameOriginRequest(request,origin)) return respond({ok:false,error:'Please use the AX store.'},403);
 const guard=reserveCartBurst(request,{limit:cartBurstLimit()});
 if(!guard.allowed) return respond({ok:false,error:'Too many bag updates. Please wait a moment and try again.'},429,guard,{'Retry-After':String(guard.retryAfter)});
 let body;
 try {body=await readLimitedJson(request,MAX_CART_BODY_BYTES);} catch(error) {return respond({ok:false,error:error.message || 'Invalid request.'},400,guard);}
 const invalid=validateCartInput(body);
 if(invalid) return respond({ok:false,error:invalid},400,guard);
 if(!shopifyConfigured()) return respond({ok:false,error:'Checkout is unavailable in this store preview.'},503,guard);
 const {action,cartId,merchandiseId,quantity=1,lineId}=body;
 const variables=action==='get'?{id:cartId}:action==='remove'?{cartId,lineIds:[lineId]}:action==='update'?{cartId,lines:[{id:lineId,quantity}]}:{...(action==='add'?{cartId}:{}),lines:[{merchandiseId,quantity}]};
 // Enable only a header overwritten by the trusted hosting proxy.
 const ipHeader=process.env.SHOPIFY_BUYER_IP_HEADER,rawIp=ipHeader?request.headers.get(ipHeader)?.trim():'';
 try{
  const data=await storefront(cartOperations[action],variables,{revalidate:0,buyerIp:rawIp && isIP(rawIp)?rawIp:undefined});
  const keys={create:'cartCreate',add:'cartLinesAdd',update:'cartLinesUpdate',remove:'cartLinesRemove'},result=action==='get'?{cart:data.cart}:data[keys[action]];
  if(result.userErrors?.length) return respond({ok:false,error:result.userErrors.map(e => e.message).join(' ')},400,guard);
  if(!result.cart) return respond({ok:false,code:'CART_NOT_FOUND',error:'This bag has expired. Please add your items again.'},404,guard);
  return respond({ok:true,cart:result.cart},200,guard);
 }catch{return respond({ok:false,error:'We couldn’t update your bag. Please try again.'},502,guard);}
}
