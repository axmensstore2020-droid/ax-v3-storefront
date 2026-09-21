import {NextResponse} from 'next/server';
import {MARKETING_CONSENT_COOKIE,MARKETING_GRANTED} from '../../../../lib/marketing.js';
import {metaCapiConfigured,normalizeMetaEvent,sendMetaEvent} from '../../../../lib/meta.js';
import {META_GUARD_COOKIE,cookieValue,readLimitedJson,reserveMetaBurst,sameOriginRequest} from '../../../../lib/request-security.js';

export const dynamic='force-dynamic';

function json(body,status=200,headers={}){
 return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff',...headers}});
}

export async function POST(request){
 if(!sameOriginRequest(request,process.env.AX_SITE_ORIGIN)) return json({ok:false,error:'Forbidden.'},403);
 if(cookieValue(request,MARKETING_CONSENT_COOKIE)!==MARKETING_GRANTED) return json({ok:false,error:'Marketing consent is required.'},403);
 if(!metaCapiConfigured()) return json({ok:false,error:'Marketing event service is unavailable.'},503);
 const burst=reserveMetaBurst(request,{limit:80});
 const headers=burst.setCookie?{'Set-Cookie':`${META_GUARD_COOKIE}=${burst.token}; Path=/api/meta; Max-Age=3600; HttpOnly; SameSite=Strict${process.env.NODE_ENV==='production'?'; Secure':''}`}:{ };
 if(!burst.allowed) return json({ok:false,error:'Too many requests.'},429,{...headers,'Retry-After':String(burst.retryAfter)});
 try{
  const body=await readLimitedJson(request,8192);
  const event=normalizeMetaEvent(body);
  await sendMetaEvent(request,event);
  return json({ok:true},200,headers);
 }catch(error){
  const message=/Unsupported|Invalid|Send JSON|too large/i.test(error?.message || '') ? error.message : 'Marketing event could not be processed.';
  return json({ok:false,error:message},/Unsupported|Invalid|Send JSON|too large/i.test(message)?400:502,headers);
 }
}
