import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import {isIP} from 'node:net';

export const CART_GUARD_COOKIE='ax_cart_guard';
export const META_GUARD_COOKIE='ax_meta_guard';
export const ANALYTICS_GUARD_COOKIE='ax_analytics_guard';
export const SHIPPING_GUARD_COOKIE='ax_shipping_guard';
const buckets=new Map();
const MAX_BUCKETS=4096;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sameOriginRequest(request,origin) {
  if(!origin) return false;
  try {
    const expected=new URL(origin);
    if(expected.origin!==origin || (expected.protocol!=='https:' && !(process.env.NODE_ENV!=='production' && expected.hostname==='localhost'))) return false;
    const supplied=request.headers.get('origin');
    const site=request.headers.get('sec-fetch-site');
    return supplied===expected.origin && site!=='cross-site';
  } catch { return false; }
}

export async function readLimitedJson(request,maxBytes=8192) {
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('Send JSON.');
  const declared=Number(request.headers.get('content-length') || 0);
  if(Number.isFinite(declared) && declared>maxBytes) throw new Error('Request is too large.');
  const reader=request.body?.getReader();
  if(!reader) throw new Error('Empty request.');
  const chunks=[]; let size=0;
  try {
    while(true) {
      const {done,value}=await reader.read();
      if(done) break;
      size+=value.byteLength;
      if(size>maxBytes) { await reader.cancel(); throw new Error('Request is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes=new Uint8Array(size); let offset=0;
  for(const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try {return JSON.parse(new TextDecoder().decode(bytes));} catch {throw new Error('Invalid JSON.');}
}

function cookieValue(request,name) {
  const raw=request.headers.get('cookie') || '';
  const pair=raw.split(';').map(item=>item.trim()).find(item=>item.startsWith(name+'='));
  return pair ? pair.slice(name.length+1) : '';
}

function hashKey(value) {return createHash('sha256').update(String(value)).digest('hex');}

function prune(now) {
  for(const [key,bucket] of buckets) if(bucket.resetAt<=now) buckets.delete(key);
}

function reserveAnonymousBurst(request,{cookieName,limit,windowMs,ipHeader,now}) {
  const safeLimit=Math.min(240,Math.max(10,Number(limit)||40));
  const safeWindow=Math.min(5*60_000,Math.max(10_000,Number(windowMs)||60_000));
  const rawIp=ipHeader ? request.headers.get(ipHeader)?.trim() : '';
  let token=cookieValue(request,cookieName),setCookie=false,key;
  if(rawIp && isIP(rawIp)) key=`${cookieName}:ip:`+hashKey(rawIp);
  else {
    if(!UUID.test(token)) {token=randomUUID();setCookie=true;}
    key=`${cookieName}:visitor:`+token;
  }
  prune(now);
  if(!buckets.has(key) && buckets.size>=MAX_BUCKETS) return {allowed:false,token,setCookie,retryAfter:60};
  const bucket=buckets.get(key);
  if(!bucket || bucket.resetAt<=now) {
    buckets.set(key,{count:1,resetAt:now+safeWindow});
    return {allowed:true,token,setCookie,retryAfter:0};
  }
  if(bucket.count>=safeLimit) return {allowed:false,token,setCookie,retryAfter:Math.max(1,Math.ceil((bucket.resetAt-now)/1000))};
  bucket.count+=1;
  return {allowed:true,token,setCookie,retryAfter:0};
}

export function reserveCartBurst(request,{limit=40,windowMs=60_000,ipHeader=process.env.SHOPIFY_BUYER_IP_HEADER,now=Date.now()}={}) {
  return reserveAnonymousBurst(request,{cookieName:CART_GUARD_COOKIE,limit,windowMs,ipHeader,now});
}

export function reserveMetaBurst(request,{limit=80,windowMs=60_000,ipHeader=process.env.META_IP_HEADER,now=Date.now()}={}) {
  return reserveAnonymousBurst(request,{cookieName:META_GUARD_COOKIE,limit,windowMs,ipHeader,now});
}

export function reserveShippingBurst(request,{limit=18,windowMs=60_000,ipHeader=process.env.SHOPIFY_BUYER_IP_HEADER,now=Date.now()}={}) {
  return reserveAnonymousBurst(request,{cookieName:SHIPPING_GUARD_COOKIE,limit,windowMs,ipHeader,now});
}

export function reserveAnalyticsBurst(request,{limit=100,windowMs=60_000,ipHeader=process.env.META_IP_HEADER,now=Date.now()}={}) {
  return reserveAnonymousBurst(request,{cookieName:ANALYTICS_GUARD_COOKIE,limit,windowMs,ipHeader,now});
}
