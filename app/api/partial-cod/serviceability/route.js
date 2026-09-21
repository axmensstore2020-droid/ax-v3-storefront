import {checkDelhiveryPincode,normalizePincode} from '../../../../lib/delhivery.js';
import {partialCodConfigured} from '../../../../lib/partial-cod-server.js';
import {readShippingPost,shippingJson} from '../../../../lib/shipping-route.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request) {
  const input=await readShippingPost(request,{maxBytes:1024,limit:18,rateError:'Too many COD checks. Please try again shortly.'});
  if(input.response)return input.response;
  const {body,guard}=input;
  if(!partialCodConfigured()) return shippingJson({ok:false,error:'Partial COD is not available yet.'},503,guard);
  const pincode=normalizePincode(body?.pincode);
  if(!pincode) return shippingJson({ok:false,error:'Enter a valid 6-digit pincode.'},400,guard);
  const result=await checkDelhiveryPincode(pincode);
  if(!result.configured) return shippingJson({ok:false,error:'Delivery service is not configured yet.'},503,guard);
  if(result.error) return shippingJson({ok:false,error:result.error},502,guard);
  return shippingJson({ok:true,pincode,deliveryAvailable:Boolean(result.prepaidServiceable),codAvailable:Boolean(result.codServiceable),location:{city:result.city||'',district:result.district||'',stateCode:result.stateCode||'',isOda:Boolean(result.isOda)}},200,guard);
}
