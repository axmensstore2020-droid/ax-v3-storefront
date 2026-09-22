import {createHmac,randomUUID} from 'node:crypto';
import {NextResponse} from 'next/server';
import {MARKETING_CONSENT_COOKIE,MARKETING_GRANTED} from '../../../../lib/marketing.js';
import {createDatabase,databaseConfigured} from '../../../../lib/stylist/database.js';
import {ANALYTICS_GUARD_COOKIE,cookieValue,readLimitedJson,reserveAnalyticsBurst,sameOriginRequest} from '../../../../lib/request-security.js';
import {assertAllowedKeys} from '../../../../lib/request-body.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const VISITOR_COOKIE='ax_store_visitor';
const EVENTS=new Set(['product_view','search','filter','select_variant','size_guide','shipping_quote','recommendation_click','add_to_cart','add_look','begin_checkout','web_vital']);

function safeText(value,max){return String(value || '').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);}
function json(body,status=200,headers={}){return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff',...headers}});}
function visitor(request,secret){
  const existing=cookieValue(request,VISITOR_COOKIE);
  const id=/^[0-9a-f-]{36}$/i.test(existing)?existing:randomUUID();
  return {id,isNew:id!==existing,hash:createHmac('sha256',secret).update('store:'+id).digest('hex')};
}
function sanitizeMetadata(value){
  if(!value || typeof value!=='object' || Array.isArray(value)) return {};
  const entries=Object.entries(value).slice(0,12).map(([key,raw])=>{
    const cleanKey=safeText(key,40).replace(/[^A-Za-z0-9_.-]/g,'');
    if(!cleanKey)return null;
    if(typeof raw==='boolean')return [cleanKey,raw];
    if(typeof raw==='number' && Number.isFinite(raw))return [cleanKey,Math.max(-1000000,Math.min(1000000,raw))];
    return [cleanKey,safeText(raw,160)];
  }).filter(Boolean);
  return Object.fromEntries(entries);
}

export async function POST(request){
  if(!sameOriginRequest(request,process.env.AX_SITE_ORIGIN)) return json({ok:false,error:'Forbidden.'},403);
  if(cookieValue(request,MARKETING_CONSENT_COOKIE)!==MARKETING_GRANTED) return json({ok:false,error:'Analytics consent is required.'},403);
  const secret=String(process.env.AX_ANALYTICS_SECRET || process.env.AX_STYLIST_SECRET || '');
  if(!databaseConfigured() || secret.length<32) return json({ok:false,error:'Analytics is not configured.'},503);
  const burst=reserveAnalyticsBurst(request,{limit:100});
  const headers=burst.setCookie?{'Set-Cookie':`${ANALYTICS_GUARD_COOKIE}=${burst.token}; Path=/api/analytics; Max-Age=3600; HttpOnly; SameSite=Strict${process.env.NODE_ENV==='production'?'; Secure':''}`}:{};
  if(!burst.allowed) return json({ok:false,error:'Too many requests.'},429,{...headers,'Retry-After':String(burst.retryAfter)});
  try{
    const body=await readLimitedJson(request,4096);
    assertAllowedKeys(body,['eventName','path','productHandle','value','currency','metadata'],'analytics');
    const eventName=safeText(body?.eventName,40);
    if(!EVENTS.has(eventName)) return json({ok:false,error:'Unsupported event.'},400,headers);
    const path=safeText(body?.path,512);
    if(path && !path.startsWith('/')) return json({ok:false,error:'Invalid path.'},400,headers);
    const productHandle=safeText(body?.productHandle,160).replace(/[^a-zA-Z0-9_-]/g,'');
    const value=body?.value===null || body?.value===undefined ? null : Number(body.value);
    const currency=/^[A-Z]{3}$/.test(String(body?.currency || 'INR').toUpperCase())?String(body.currency || 'INR').toUpperCase():'INR';
    const identity=visitor(request,secret);
    await createDatabase().writeStoreEvent({
      visitor_hash:identity.hash,event_name:eventName,path,product_handle:productHandle,
      value:Number.isFinite(value)&&value>=0&&value<10000000?Math.round(value*100)/100:null,
      currency,metadata:sanitizeMetadata(body?.metadata),created_at:new Date().toISOString()
    });
    const response=json({ok:true},200,headers);
    if(identity.isNew) response.cookies.set(VISITOR_COOKIE,identity.id,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:90*24*60*60});
    return response;
  }catch{return json({ok:false,error:'Analytics event could not be stored.'},502,headers);}
}
