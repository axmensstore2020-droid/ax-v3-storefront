import {NextResponse} from 'next/server';
import {createDatabase,databaseConfigured} from '../../../lib/stylist/database.js';
import {getProduct} from '../../../lib/shopify.js';
import {readLimitedJson,reserveRestockBurst,RESTOCK_GUARD_COOKIE,sameOriginRequest} from '../../../lib/request-security.js';
import {normalizeRestockEmail,normalizeRestockHandle,normalizeRestockVariantId,restockVariantLabel,soldOutVariantForProduct} from '../../../lib/restock-alerts.js';
import {restockAlertSignupConfigured,restockSecret} from '../../../lib/restock-config.js';
import {createRestockVerification} from '../../../lib/restock-verification.js';
import {sendRestockVerificationEmail} from '../../../lib/restock-email.js';
import {reserveProviderBudget} from '../../../lib/provider-budget.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function json(body,status=200,headers={}){
  return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff',...headers}});
}

export async function POST(request){
  if(!sameOriginRequest(request,process.env.AX_SITE_ORIGIN)) return json({ok:false,error:'Forbidden.'},403);
  if(!restockAlertSignupConfigured() || !databaseConfigured() || restockSecret().length<32) return json({ok:false,error:'Restock alerts are not configured.'},503);
  const burst=reserveRestockBurst(request,{limit:10,windowMs:300000});
  const headers=burst.setCookie?{'Set-Cookie':`${RESTOCK_GUARD_COOKIE}=${burst.token}; Path=/api/back-in-stock; Max-Age=3600; HttpOnly; SameSite=Strict${process.env.NODE_ENV==='production'?'; Secure':''}`}:{};
  if(!burst.allowed) return json({ok:false,error:'Too many requests. Please try again shortly.'},429,{...headers,'Retry-After':String(burst.retryAfter)});

  try{
    const body=await readLimitedJson(request,2048);
    const email=normalizeRestockEmail(body?.email);
    const productHandle=normalizeRestockHandle(body?.productHandle);
    const variantId=normalizeRestockVariantId(body?.variantId);
    if(!email || !productHandle || !variantId) return json({ok:false,error:'Check the email and selected product option.'},400,headers);

    const product=await getProduct(productHandle);
    if(!product || product.demo) return json({ok:false,error:'This product is unavailable.'},404,headers);
    const exact=(product.variants||[]).find(item=>item?.id===variantId);
    if(!exact) return json({ok:false,error:'That product option is unavailable.'},404,headers);
    if(exact.availableForSale) return json({ok:false,available:true,error:'This option is available now.'},409,headers);
    const variant=soldOutVariantForProduct(product,variantId);
    if(!variant) return json({ok:false,error:'That product option is not eligible for a restock alert.'},400,headers);

    const budget=await reserveProviderBudget('restock-signup',{limit:Math.min(5000,Math.max(50,Number(process.env.AX_RESTOCK_DAILY_SIGNUP_LIMIT)||500))});
    if(!budget.allowed) return json({ok:false,error:'Restock signups are temporarily limited. Please try again later.'},429,headers);

    const verification=createRestockVerification(restockSecret());
    await createDatabase().saveRestockSubscription({
      email,productHandle,variantId,
      variantLabel:restockVariantLabel(variant),verificationHash:verification.hash,verificationExpiresAt:verification.expiresAt
    });
    await sendRestockVerificationEmail({email,product,variant,token:verification.token,verificationHash:verification.hash});
    return json({ok:true,verificationRequired:true},201,headers);
  }catch{
    return json({ok:false,error:'We couldn’t save that restock request right now.'},502,headers);
  }
}
