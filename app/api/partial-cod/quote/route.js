import {quotePartialCod,partialCodConfigured} from '../../../../lib/partial-cod-server.js';
import {readShippingPost,shippingJson} from '../../../../lib/shipping-route.js';
import {cartSessionConfigured,requestOwnsCart} from '../../../../lib/cart-session.js';

const MAX_BODY_BYTES=4096;

export async function POST(request) {
  const input=await readShippingPost(request,{maxBytes:MAX_BODY_BYTES,limit:12,windowMs:60_000,rateError:'Too many checkout attempts. Please wait a moment and try again.'});
  if(input.response)return input.response;
  const {body,guard}=input;
  if(!partialCodConfigured()) return shippingJson({ok:false,error:'Partial COD is not available yet.'},503,guard);
  if(cartSessionConfigured() && !requestOwnsCart(request,body?.cartId)) return shippingJson({ok:false,error:'This bag session has expired. Please reopen your bag.'},403,guard);
  try {
    const result=await quotePartialCod(body.cartId,body.pincode);
    const {cart:_cart,...customerResult}=result;
    return shippingJson({ok:true,...customerResult},200,guard);
  } catch(error) {
    return shippingJson({ok:false,error:error?.message || 'Partial COD is temporarily unavailable.'},400,guard);
  }
}
