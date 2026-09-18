import {NextResponse} from 'next/server';
import {checkDelhiveryPincode,quoteDelhiveryRate} from '../../../../lib/delhivery.js';
import {normalizePincode} from '../../../../lib/delhivery.js';
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
  if(!sameOriginRequest(request,process.env.AX_SITE_ORIGIN)) return json({ok:false,error:'Please use the AX store.'},403);
  const guard=reserveShippingBurst(request,{limit:18});
  if(!guard.allowed) return json({ok:false,error:'Too many delivery checks. Please try again shortly.'},429,guard,{'Retry-After':String(guard.retryAfter)});
  let body;
  try {body=await readLimitedJson(request,2048);} catch(error) {return json({ok:false,error:error.message || 'Invalid request.'},400,guard);}
  const pincode=normalizePincode(body?.pincode);
  const weightGrams=Math.ceil(Number(body?.weightGrams));
  if(!pincode) return json({ok:false,error:'Enter a valid 6-digit pincode.'},400,guard);
  if(!Number.isFinite(weightGrams) || weightGrams<1 || weightGrams>100000) return json({ok:false,error:'Delivery weight is unavailable for this item.'},400,guard);

  const serviceability=await checkDelhiveryPincode(pincode);
  if(!serviceability.configured) return json({ok:false,error:'Delivery estimates are not configured yet.'},503,guard);
  if(serviceability.error) return json({ok:false,error:serviceability.error},502,guard);
  if(!serviceability.serviceable) return json({ok:true,serviceable:false,pincode,rates:[]},200,guard);

  const originPincode=normalizePincode(process.env.DELHIVERY_ORIGIN_PIN || '641011');
  const [surface,express]=await Promise.all([
    quoteDelhiveryRate({originPincode,destinationPincode:pincode,weightGrams,mode:'S'}),
    quoteDelhiveryRate({originPincode,destinationPincode:pincode,weightGrams,mode:'E'})
  ]);
  const fee=Number(process.env.AX_SHIPPING_ORDER_FEE ?? 3);
  const safeFee=Number.isFinite(fee)&&fee>=0&&fee<=100?Math.round(fee*100)/100:3;
  const rates=[];
  if(surface.amount!=null) rates.push({code:'standard',label:'Standard',amount:Math.round((surface.amount+safeFee)*100)/100,currency:'INR'});
  if(express.amount!=null) rates.push({code:'express',label:'Express',amount:Math.round((express.amount+safeFee)*100)/100,currency:'INR'});
  if(!rates.length) return json({ok:false,error:surface.error || express.error || 'Delivery rates are temporarily unavailable.'},502,guard);
  return json({ok:true,serviceable:true,pincode,rates},200,guard);
}
