import {NextResponse} from 'next/server';
import {estimateDelhiveryDelivery,normalizePincode} from '../../../../lib/delhivery.js';
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
    httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/shipping',maxAge:60*60
  });
  return response;
}

export async function POST(request) {
  const requestOrigin=new URL(request.url).origin,configuredOrigin=process.env.AX_SITE_ORIGIN;
  const originAllowed=(configuredOrigin&&sameOriginRequest(request,configuredOrigin)) || sameOriginRequest(request,requestOrigin);
  if(!originAllowed) return json({ok:false,error:'Please use the AX store.'},403);
  const guard=reserveShippingBurst(request,{limit:18});
  if(!guard.allowed) return json({ok:false,error:'Too many delivery checks. Please try again shortly.'},429,guard,{'Retry-After':String(guard.retryAfter)});
  let body;
  try {body=await readLimitedJson(request,2048);} catch(error) {return json({ok:false,error:error.message || 'Invalid request.'},400,guard);}

  const pincode=normalizePincode(body?.pincode);
  if(!pincode) return json({ok:false,error:'Enter a valid 6-digit pincode.'},400,guard);
  const suppliedWeight=body?.weightGrams;
  const weightGrams=suppliedWeight===null || suppliedWeight===undefined || suppliedWeight==='' ? null : Math.ceil(Number(suppliedWeight));
  if(weightGrams!==null && (!Number.isFinite(weightGrams) || weightGrams<1 || weightGrams>100000)) {
    return json({ok:false,error:'Delivery weight is unavailable for this item.'},400,guard);
  }

  const estimate=await estimateDelhiveryDelivery({
    destinationPincode:pincode,
    weightGrams,
    subtotal:Number(body?.subtotal)||0
  });
  if(!estimate.configured) return json({ok:false,error:'Delivery estimates are not configured yet.'},503,guard);
  if(estimate.error && !estimate.serviceable) return json({ok:false,error:estimate.error},502,guard);
  return json({ok:true,...estimate},200,guard);
}
