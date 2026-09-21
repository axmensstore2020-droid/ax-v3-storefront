import {randomUUID} from 'node:crypto';
import {json,stylistConfigured,reserveRequest} from '../../../lib/stylist/http.js';
import {sameOrigin,validateImage,historyFromToken,historyToken,conversationContext,hash} from '../../../lib/stylist/security.js';
import {validateChat} from '../../../lib/stylist/validation.js';
import {readLimitedJson} from '../../../lib/request-body.js';
import {createOpenAI} from '../../../lib/stylist/openai.js';
import {createCatalog} from '../../../lib/stylist/catalog.js';
import {createDatabase} from '../../../lib/stylist/database.js';
import {stylistConfig} from '../../../lib/stylist/config.js';
import {createUsage} from '../../../lib/stylist/usage.js';
import {runStylist} from '../../../lib/stylist/assistant.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET() {
  const available=stylistConfigured();
  return json({available,images:available && process.env.AX_STYLIST_IMAGES_ENABLED==='true',profiles:available});
}
export async function POST(request) {
  if(!sameOrigin(request,process.env.AX_SITE_ORIGIN)) return json({ok:false,error:'Please use AX Stylist from this store.'},403);
  if(!stylistConfigured()) return json({ok:false,error:'Personal AI styling is not available yet. You can still explore the catalog or email AX.'},503);
  let body;
  try {
    body=validateChat(await readLimitedJson(request));
    if(body.image && process.env.AX_STYLIST_IMAGES_ENABLED!=='true') throw new Error('Photo styling is not enabled yet.');
    body.image=validateImage(body.image);
  } catch(error) {return json({ok:false,error:error.message},400);}
  let session,usage,lastRoute,success=false,errorCode='request';
  const requestId=randomUUID(),start=Date.now(),config=stylistConfig();
  try {
    const reserved=await reserveRequest(request);session=reserved.session;
    if(reserved.error) return reserved.error;
    let history,context;
    try {
      history=historyFromToken(body.conversation,session.id,process.env.AX_STYLIST_SECRET);
      context=conversationContext(body.conversation,session.id,process.env.AX_STYLIST_SECRET);
    } catch {return json({ok:false,code:'CHAT_EXPIRED',error:'This chat expired. Start a new conversation.'},400,session);}
    const db=createDatabase();
    usage=createUsage({db,config,requestId,sessionId:session.id,conversationId:context.id,secret:process.env.AX_STYLIST_SECRET});
    if(body.profile===null) {try{body.profile=await db.getProfile(session.id) || {};}catch{body.profile={};}}
    const deadline=AbortSignal.any([request.signal,AbortSignal.timeout(Math.max(1,50000-(Date.now()-start)))]);
    const ai=createOpenAI(process.env,fetch,deadline,usage);
    const result=await runStylist({...body,history,summary:context.summary,config,ai,catalog:createCatalog(),
      reserveAdvanced:limit=>db.reserveAdvanced(limit),onRoute:route=>{lastRoute=route;},safetyId:hash(session.id,process.env.AX_STYLIST_SECRET)});
    const messages=result.excludeFromHistory?history:[...history,{role:'user',content:body.message},{role:'assistant',content:result.message+(result.products.length?'\nPreviously viewed product handles (recheck before claims): '+result.products.map(p=>p.handle).join(', '):'')}];
    success=true;
    return json({ok:true,...result,conversation:historyToken(messages,session.id,process.env.AX_STYLIST_SECRET,context,config)},200,session);
  } catch(error) {
    errorCode=error.code==='CATALOG_UNAVAILABLE'?'catalog':'request';
    console.warn('AX Stylist request failed',requestId,errorCode);
    const message=errorCode==='catalog'?'AX Stylist can’t check the catalog right now. Please try again in a moment, or browse the store.':'AX Stylist is temporarily unavailable. Please try again, browse the catalog, or email contact@axstore.in.';
    return json({ok:false,code:errorCode==='catalog'?'CATALOG_UNAVAILABLE':'STYLIST_UNAVAILABLE',error:message,requestId},502,session);
  } finally {
    usage?.record({event:'turn',route:lastRoute,latencyMs:Date.now()-start,success,errorCode:success?null:errorCode});
    await usage?.flush();
  }
}
