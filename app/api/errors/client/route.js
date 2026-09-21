import {NextResponse} from 'next/server';
import {reportServerError} from '../../../../lib/error-monitoring.js';
import {ERROR_GUARD_COOKIE,readLimitedJson,reserveErrorBurst,sameOriginRequest} from '../../../../lib/request-security.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function json(body,status=200,guard=null){
  const response=NextResponse.json(body,{status,headers:{'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'}});
  if(guard?.setCookie && guard.token) response.cookies.set(ERROR_GUARD_COOKIE,guard.token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/errors',maxAge:3600});
  return response;
}

const safe=(value,max)=>String(value || '').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);

export async function POST(request){
  if(!sameOriginRequest(request,process.env.AX_SITE_ORIGIN)) return json({ok:false},403);
  const guard=reserveErrorBurst(request,{limit:12,windowMs:60_000});
  if(!guard.allowed) return json({ok:false},429,guard);
  let body;
  try{body=await readLimitedJson(request,16000);}catch{return json({ok:false},400,guard);}
  const error=new Error(safe(body?.message,1000) || 'Client application error');
  error.name=safe(body?.name,120) || 'ClientError';
  const stack=safe(body?.stack,12000);
  if(stack) error.stack=stack;
  await reportServerError(error,{source:'client-error-boundary',path:safe(body?.path,500),digest:safe(body?.digest,200)});
  return json({ok:true},202,guard);
}
