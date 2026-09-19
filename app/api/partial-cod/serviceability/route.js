import {NextResponse} from 'next/server';
import {checkDelhiveryPincode,normalizePincode} from '../../../../lib/delhivery.js';
import {partialCodConfigured} from '../../../../lib/partial-cod-server.js';
import {readLimitedJson,reserveShippingBurst,sameOriginRequest,SHIPPING_GUARD_COOKIE} from '../../../../lib/request-security.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function json(body,status=200,guard=null,extra={}) {
  const response=NextResponse.json(body,{status,headers:{
    'Cache-Control':'no-store, private',
    'X-Content-Type-Options':'nosniff',
    'Cross-Origin-Resource-Policy':'same-origin',
    ...extra
  }});
  if(guard?.setCookie && guard.token) response.cookies.set(SHIPPING_GUARD_COOKIE,guard.token,{
    httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/partial-cod',maxAge:60*60
  });
  return response;
}

export async function POST(request) {
  const requestOrigin=new URL(request.url).origin,configuredOrigin=process.env.AX_SITE_ORIGIN;
  const originAllowed=(configuredOrigin&&sameOriginRequest(request,configuredOrigin)) || sameOriginRequest(request,requestOrigin);
  if(!originAllowed) return json({ok:false,error:'Please use the AX store.'},403);
  const guard=reserveShippingBurst(request,{limit:18});
  if(!guard.allowed) return json({ok:false,error:'Too many COD checks. Please try again shortly.'},429,guard,{'Retry-After':String(guard.retryAfter)});
  if(!partialCodConfigured()) return json({ok:false,error:'Partial COD is not available yet.'},503,guard);

  let body;
  try {body=await readLimitedJson(request,1024);} catch(error) {return json({ok:false,error:error.message || 'Invalid request.'},400,guard);}
  const pincode=normalizePincode(body?.pincode);
  if(!pincode) return json({ok:false,error:'Enter a valid 6-digit pincode.'},400,guard);

  const result=await checkDelhiveryPincode(pincode);
  if(!result.configured) return json({ok:false,error:'Delivery service is not configured yet.'},503,guard);
  if(result.error) return json({ok:false,error:result.error},502,guard);

  return json({
    ok:true,
    pincode,
    deliveryAvailable:Boolean(result.prepaidServiceable),
    codAvailable:Boolean(result.codServiceable),
    location:{city:result.city||'',district:result.district||'',stateCode:result.stateCode||'',isOda:Boolean(result.isOda)}
  },200,guard);
}
