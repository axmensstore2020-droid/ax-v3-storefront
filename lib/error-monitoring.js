import 'server-only';
import {randomBytes} from 'node:crypto';

const text=(value,max=500)=>String(value || '').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);

export function parseSentryDsn(value){
  try{
    const url=new URL(String(value || '').trim());
    const projectId=url.pathname.split('/').filter(Boolean).pop() || '';
    if(url.protocol!=='https:' || !url.username || !/^\d+$/.test(projectId)) return null;
    return {dsn:url.toString(),origin:url.origin,publicKey:url.username,projectId};
  }catch{return null;}
}

function safePath(value){
  try{
    const url=new URL(String(value || ''),'https://ax.invalid');
    return (url.pathname || '/').slice(0,500);
  }catch{return '';}
}

function cleanContext(value={}){
  const out={};
  for(const [key,raw] of Object.entries(value || {}).slice(0,16)){
    const cleanKey=text(key,60).replace(/[^A-Za-z0-9_.-]/g,'');
    if(!cleanKey) continue;
    if(typeof raw==='boolean' || typeof raw==='number') out[cleanKey]=raw;
    else if(/(?:path|url)$/i.test(cleanKey)) out[cleanKey]=safePath(raw);
    else out[cleanKey]=text(raw,500);
  }
  return out;
}

export async function reportServerError(error,context={},env=process.env,fetchImpl=fetch){
  const config=parseSentryDsn(env.SENTRY_DSN);
  if(!config) return false;
  const eventId=randomBytes(16).toString('hex');
  const source=text(context.source || 'server',80);
  const path=safePath(context.path);
  const event={
    event_id:eventId,
    timestamp:new Date().toISOString(),
    platform:'javascript',
    level:'error',
    environment:text(env.AX_ERROR_ENVIRONMENT || env.NODE_ENV || 'production',80),
    ...(env.AX_ERROR_RELEASE?{release:text(env.AX_ERROR_RELEASE,160)}:{}),
    tags:{source},
    exception:{values:[{
      type:text(error?.name || 'Error',120),
      value:text(error?.message || 'Unexpected application error',1000),
      ...(text(error?.stack,12000)?{stacktrace:{frames:[{filename:'server',function:text(error?.stack,12000)}]}}:{})
    }]},
    ...(path?{request:{url:path}}:{}),
    extra:cleanContext(context)
  };
  const envelope=[
    JSON.stringify({event_id:eventId,dsn:config.dsn}),
    JSON.stringify({type:'event',content_type:'application/json'}),
    JSON.stringify(event)
  ].join('\n');
  try{
    const response=await fetchImpl(`${config.origin}/api/${config.projectId}/envelope/?sentry_version=7&sentry_key=${encodeURIComponent(config.publicKey)}&sentry_client=ax-v3-storefront%2F1.0`,{
      method:'POST',
      headers:{'Content-Type':'application/x-sentry-envelope'},
      body:envelope,
      cache:'no-store',
      signal:AbortSignal.timeout(3000)
    });
    return response.ok;
  }catch{return false;}
}
