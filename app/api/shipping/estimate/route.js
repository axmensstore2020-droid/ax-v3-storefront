import {estimateDelhiveryDelivery,normalizePincode} from '../../../../lib/delhivery.js';
import {readShippingPost,shippingJson} from '../../../../lib/shipping-route.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request) {
  const input=await readShippingPost(request,{maxBytes:2048,limit:18,rateError:'Too many delivery checks. Please try again shortly.'});
  if(input.response)return input.response;
  const {body,guard}=input;
  const pincode=normalizePincode(body?.pincode);
  if(!pincode) return shippingJson({ok:false,error:'Enter a valid 6-digit pincode.'},400,guard);
  const suppliedWeight=body?.weightGrams;
  const weightGrams=suppliedWeight===null || suppliedWeight===undefined || suppliedWeight==='' ? null : Math.ceil(Number(suppliedWeight));
  if(weightGrams!==null && (!Number.isFinite(weightGrams) || weightGrams<1 || weightGrams>100000)) return shippingJson({ok:false,error:'Delivery weight is unavailable for this item.'},400,guard);
  const result=await estimateDelhiveryDelivery({destinationPincode:pincode,weightGrams,subtotal:Number(body?.subtotal)||0});
  if(!result.configured) return shippingJson({ok:false,error:'Delivery estimates are not configured yet.'},503,guard);
  if(result.error && !result.serviceable) return shippingJson({ok:false,error:result.error},502,guard);
  const {rates:_rates,...customerEstimate}=result;
  return shippingJson({ok:true,...customerEstimate},200,guard);
}
