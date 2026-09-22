import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {cookieValue} from './request-security.js';

export const CART_OWNER_COOKIE='ax_cart_owner';
export const CART_OWNER_MAX_AGE=30*24*60*60;

export function cartSessionSecret(env=process.env){
  return String(env.AX_CART_SESSION_SECRET || env.AX_STYLIST_SECRET || env.SHOPIFY_CUSTOMER_ACCOUNT_SESSION_SECRET || '');
}
export function cartSessionConfigured(env=process.env){return cartSessionSecret(env).length>=32;}

const mac=(value,secret)=>createHmac('sha256',secret).update(String(value)).digest('base64url');
const cartHash=(cartId,secret)=>mac('cart:'+cartId,secret);

export function sealCartOwnership(cartId,secret,now=Date.now()){
  if(!cartId || !secret || secret.length<32)return '';
  const payload=Buffer.from(JSON.stringify({v:1,h:cartHash(cartId,secret),exp:now+CART_OWNER_MAX_AGE*1000})).toString('base64url');
  return payload+'.'+mac(payload,secret);
}

export function ownsCartToken(token,cartId,secret,now=Date.now()){
  if(!token || !cartId || !secret || secret.length<32)return false;
  const parts=String(token).split('.');
  if(parts.length!==2)return false;
  const expected=mac(parts[0],secret);
  const a=Buffer.from(parts[1]),b=Buffer.from(expected);
  if(a.length!==b.length || !timingSafeEqual(a,b))return false;
  try{
    const value=JSON.parse(Buffer.from(parts[0],'base64url').toString());
    return value?.v===1 && Number(value.exp)>now && typeof value.h==='string' && value.h===cartHash(cartId,secret);
  }catch{return false;}
}

export function requestOwnsCart(request,cartId,env=process.env){
  const secret=cartSessionSecret(env);
  if(secret.length<32)return false;
  return ownsCartToken(cookieValue(request,CART_OWNER_COOKIE),cartId,secret);
}

export function cartOwnerCookie(cartId,env=process.env){
  const secret=cartSessionSecret(env);
  return secret.length>=32 ? sealCartOwnership(cartId,secret) : '';
}

export function cartOwnerCookieOptions(env=process.env){
  return {httpOnly:true,secure:env.NODE_ENV==='production',sameSite:'strict',path:'/api',maxAge:CART_OWNER_MAX_AGE};
}
