import {randomUUID} from 'node:crypto';
import {json,stylistConfigured,reserveRequest} from '../../../lib/stylist/http.js';
import {sameOrigin,validateImage,historyFromToken,historyToken,hash} from '../../../lib/stylist/security.js';
import {readLimitedJson,validateChat} from '../../../lib/stylist/validation.js';
import {createOpenAI} from '../../../lib/stylist/openai.js';
import {createCatalog} from '../../../lib/stylist/catalog.js';
import {runStylist} from '../../../lib/stylist/assistant.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET() {
  const available = stylistConfigured();
  return json({available,images:available && process.env.AX_STYLIST_IMAGES_ENABLED === 'true',profiles:available});
}
export async function POST(request) {
  if (!sameOrigin(request,process.env.AX_SITE_ORIGIN)) return json({ok:false,error:'Please use AX Stylist from this store.'},403);
  if (!stylistConfigured()) return json({ok:false,error:'Personal AI styling is not available yet. You can still explore the catalog or email AX.'},503);
  let body;
  try {
    body = validateChat(await readLimitedJson(request));
    if (body.image && process.env.AX_STYLIST_IMAGES_ENABLED !== 'true') throw new Error('Photo styling is not enabled yet.');
    body.image = validateImage(body.image);
  } catch (error) { return json({ok:false,error:error.message},400); }
  let session;
  const requestId = randomUUID();
  try {
    const reserved = await reserveRequest(request); session = reserved.session;
    if (reserved.error) return reserved.error;
    let history;
    try { history = historyFromToken(body.conversation,session.id,process.env.AX_STYLIST_SECRET); }
    catch { return json({ok:false,code:'CHAT_EXPIRED',error:'This chat expired. Start a new conversation.'},400,session); }
    const deadline = AbortSignal.any([request.signal,AbortSignal.timeout(50000)]);
    const ai = createOpenAI(process.env,fetch,deadline);
    const result = await runStylist({...body,history,ai,catalog:createCatalog(),safetyId:hash(session.id,process.env.AX_STYLIST_SECRET)});
    const messages = result.excludeFromHistory ? history : [...history,{role:'user',content:body.message},{role:'assistant',content:result.message+(result.products.length ? '\nVerified product handles: '+result.products.map(p => p.handle).join(', ') : '')}];
    return json({ok:true,...result,conversation:historyToken(messages,session.id,process.env.AX_STYLIST_SECRET)},200,session);
  } catch {
    // Log only an incident ID, never customer text, images, tokens or profiles.
    console.warn('AX Stylist request failed',requestId);
    return json({ok:false,error:'AX Stylist is temporarily unavailable. Please try again, browse the catalog, or email contact@axstore.in.',requestId},502,session);
  }
}
