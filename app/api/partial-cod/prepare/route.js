import {NextResponse} from 'next/server';
import {preparePartialCod,partialCodConfigured} from '../../../../lib/partial-cod-server.js';
import {SHIPPING_GUARD_COOKIE,readLimitedJson,reserveShippingBurst,sameOriginRequest} from '../../../../lib/request-security.js';
import {cartSessionConfigured,requestOwnsCart} from '../../../../lib/cart-session.js';

const MAX_BODY_BYTES=12288;

function respond(data,status=200,guard=null) {
  const response=NextResponse.json(data,{status,headers:{
    'Cache-Control':'no-store, private',
    'X-Content-Type-Options':'nosniff',
    'Cross-Origin-Resource-Policy':'same-origin'
  }});
  if(guard?.setCookie && guard.token) response.cookies.set(SHIPPING_GUARD_COOKIE,guard.token,{
    httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/partial-cod',maxAge:60*60
  });
  return response;
}

export async function POST(request) {
  const requestOrigin=new URL(request.url).origin,configuredOrigin=process.env.AX_SITE_ORIGIN;
  const originAllowed=(configuredOrigin&&sameOriginRequest(request,configuredOrigin)) || sameOriginRequest(request,requestOrigin);
  if(!originAllowed) return respond({ok:false,error:'Please use the AX store.'},403);
  const guard=reserveShippingBurst(request,{limit:12,windowMs:60_000});
  if(!guard.allowed) return respond({ok:false,error:'Too many checkout attempts. Please wait a moment and try again.'},429,guard);
  if(!partialCodConfigured()) return respond({ok:false,error:'Partial COD is not available yet.'},503,guard);
  let body;
  try {body=await readLimitedJson(request,MAX_BODY_BYTES);} catch(error) {return respond({ok:false,error:error.message || 'Invalid request.'},400,guard);}
  if(cartSessionConfigured() && !requestOwnsCart(request,body?.cartId)) return respond({ok:false,error:'This bag session has expired. Please reopen your bag.'},403,guard);
  try {
    const result=await preparePartialCod(body);
  return respond({ok:true,...result},200,guard);
  } catch(error) {
    return respond({ok:false,error:error?.message || 'Partial COD is temporarily unavailable.'},400,guard);
  }
}
