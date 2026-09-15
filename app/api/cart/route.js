import {NextResponse} from 'next/server';
import {isIP} from 'node:net';
import {storefront,shopifyConfigured} from '../../../lib/shopify';
import {cartOperations} from '../../../lib/shopify-queries';
import {validateCartInput} from '../../../lib/commerce';
const respond=(data,status=200) => NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request) {
 let body;try{body=await request.json();}catch{return respond({ok:false,error:'Invalid request.'},400);}
 const invalid=validateCartInput(body);
 if(invalid) return respond({ok:false,error:invalid},400);
 if(!shopifyConfigured()) return respond({ok:false,error:'Checkout is unavailable in this store preview.'},503);
 const {action,cartId,merchandiseId,quantity=1,lineId}=body;
 const variables=action==='get'?{id:cartId}:action==='remove'?{cartId,lineIds:[lineId]}:action==='update'?{cartId,lines:[{id:lineId,quantity}]}:{...(action==='add'?{cartId}:{}),lines:[{merchandiseId,quantity}]};
 // Enable only a header overwritten by the trusted hosting proxy.
 const ipHeader=process.env.SHOPIFY_BUYER_IP_HEADER,rawIp=ipHeader?request.headers.get(ipHeader)?.trim():'';
 try{
  const data=await storefront(cartOperations[action],variables,{revalidate:0,buyerIp:rawIp && isIP(rawIp)?rawIp:undefined});
  const keys={create:'cartCreate',add:'cartLinesAdd',update:'cartLinesUpdate',remove:'cartLinesRemove'},result=action==='get'?{cart:data.cart}:data[keys[action]];
  if(result.userErrors?.length) return respond({ok:false,error:result.userErrors.map(e => e.message).join(' ')},400);
  if(!result.cart) return respond({ok:false,code:'CART_NOT_FOUND',error:'This bag has expired. Please add your items again.'},404);
  return respond({ok:true,cart:result.cart});
 }catch{return respond({ok:false,error:'We couldn’t update your bag. Please try again.'},502);}
}
