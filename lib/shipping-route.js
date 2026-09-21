import 'server-only';
import {NextResponse} from 'next/server';
import {SHIPPING_GUARD_COOKIE,readLimitedJson,reserveShippingBurst,sameOriginRequest} from './request-security.js';
import {reserveProviderBudget} from './provider-budget.js';

export function shippingJson(body,status=200,guard=null,extra={}){
  const response=NextResponse.json(body,{status,headers:{
    'Cache-Control':'no-store, private',
    'X-Content-Type-Options':'nosniff',
    'Cross-Origin-Resource-Policy':'same-origin',
    ...extra
  }});
  if(guard?.setCookie && guard.token) response.cookies.set(SHIPPING_GUARD_COOKIE,guard.token,{
    httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api',maxAge:60*60
  });
  return response;
}

export async function readShippingPost(request,{maxBytes=4096,limit=18,windowMs=60_000,rateError='Too many delivery checks. Please try again shortly.'}={}){
  const requestOrigin=new URL(request.url).origin,configuredOrigin=process.env.AX_SITE_ORIGIN;
  const originAllowed=(configuredOrigin&&sameOriginRequest(request,configuredOrigin)) || sameOriginRequest(request,requestOrigin);
  if(!originAllowed)return {response:shippingJson({ok:false,error:'Please use the AX store.'},403)};
  const guard=reserveShippingBurst(request,{limit,windowMs});
  if(!guard.allowed)return {guard,response:shippingJson({ok:false,error:rateError},429,guard,{'Retry-After':String(guard.retryAfter)})};
  const budget=await reserveProviderBudget('shipping',{limit:Math.min(50000,Math.max(100,Number(process.env.AX_SHIPPING_DAILY_LIMIT)||5000))});
  if(!budget.allowed)return {guard,response:shippingJson({ok:false,error:'Delivery checks are temporarily limited. Please try again later.'},429,guard)};
  try{return {guard,body:await readLimitedJson(request,maxBytes)};}
  catch(error){return {guard,response:shippingJson({ok:false,error:error.message || 'Invalid request.'},400,guard)};}
}
