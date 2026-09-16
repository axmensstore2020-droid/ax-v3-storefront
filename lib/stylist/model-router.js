import {stylistConfig} from './config.js';
export const ESCALATION_REASONS=['none','multi_piece_outfit','multi_constraint_styling','complex_fit','detailed_photo','low_confidence'];
const fashion=/\b(?:wear|outfit|styl(?:e|ing)|fashion|shirt|jeans|pants|trousers|cargos?|jacket|dress|fit|colou?r|fabric|sizing|garment|look|wardrobe)\b/i;
const unrelated=/\b(?:homework|math(?:ematics)?|algebra|calculus|politic(?:s|al)|election|president|diagnos(?:e|is)|medical|medication|python|javascript|write.{0,15}(?:code|essay)|debug.{0,15}code|explain.{0,15}(?:physics|chemistry))\b/i;
export function routeAXStylistRequest(context,config=stylistConfig()) {
  const message=String(context.message || ''), photo=Boolean(context.image);
  let intent='conversation',score=0,reason='none';
  if (unrelated.test(message)&&!fashion.test(message)) intent='off_topic';
  else if (/\b(?:shipping|delivery|returns?|exchanges?|refund|payment|checkout|store|branch|open|hours|contact|career|policy|policies)\b/i.test(message)&&!/(?:outfit|styling|wear)/i.test(message)) intent='store_help';
  else if (/\b(?:size|sizing|measurements?|chest|waist|hip|inseam)\b/i.test(message)) intent='fit';
  else if (/\b(?:compare|versus|vs\.?|difference|better)\b/i.test(message)) intent='comparison';
  else if (photo) intent='photo_styling';
  else if (/\b(?:outfit|wear|match|pair|style|styling|look|goes with|colou?r.*(?:work|suit)|trending)\b/i.test(message)) intent='styling';
  else if (/\b(?:show|find|search|have|available|stock|price|cost|collection|shirts?|jeans|cargos?|trousers|pants|jackets?)\b/i.test(message)) intent='catalog';
  if (['styling','fit','comparison','photo_styling'].includes(intent)) {
    const constraints=[/\b(?:under|budget|₹|rs\.?|inr)\b/i,/\b(?:wedding|date|office|party|occasion|interview|vacation|festival)\b/i,/\b(?:prefer|avoid|dislike|no prints|without|modest)\b/i,/\b(?:hot|humid|cold|winter|summer|weather)\b/i,/\b(?:relaxed|oversized|slim|regular|korean|old money|streetwear|formal)\b/i].filter(pattern=>pattern.test(message)).length;
    const dimensions=['chest','waist','hip','inseam'].filter(key=>new RegExp('\\b'+key+'\\b','i').test(message) || (/my measurements/i.test(message) && context.profile?.[key])).length;
    if (/\b(?:full|entire|complete|head.to.toe|multiple|several)\b.{0,35}\b(?:outfit|look|pieces|products|wardrobe)\b|\b(?:outfit|look)\b.{0,20}\b(?:shirt|top)\b.{0,30}\b(?:pants|trousers|shoes)\b/i.test(message)) {score+=4;reason='multi_piece_outfit';}
    if (constraints>=3) {score+=constraints+1;reason='multi_constraint_styling';}
    if (intent==='fit' && dimensions>=2 && /\b(?:recommend|analyse|analyze|compare|between|fit|sizing)\b/i.test(message)) {score+=4;reason='complex_fit';}
    if (photo && /\b(?:analyse|analyze|detailed|overall|complete|whole)\b.{0,35}\b(?:outfit|look|styling|coordination)\b/i.test(message)) {score+=4;reason='detailed_photo';}
    if (intent==='comparison' && /\b(?:many|several|all|[4-9]|four|five|six)\b/i.test(message) && constraints>=2) {score+=4;reason='multi_constraint_styling';}
    if (/\b(?:my preferences|my history|remember|personal)\b/i.test(message) && constraints>=2 && ['styles','colors','avoid','fit'].filter(key=>context.profile?.[key]).length>=3) {score+=2;reason='multi_constraint_styling';}
  }
  const advanced=config.advancedEnabled && score>=config.advancedThreshold;
  return {model:advanced?config.advancedModel:config.defaultModel,tier:advanced?'terra':'luna',
    reasoningEffort:advanced?(score>=config.mediumThreshold?'medium':'low'):['styling','fit','comparison','photo_styling'].includes(intent)?'low':'none',
    intent,score,escalationReason:advanced?reason:'none',escalated:advanced,fallback:false};
}
export function defaultRoute(route,config=stylistConfig(),fallback=false) {
  return {...route,model:config.defaultModel,tier:'luna',reasoningEffort:route.reasoningEffort==='none'?'none':'low',fallback};
}
export function escalationRoute(route,signal,config=stylistConfig()) {
  if (!config.advancedEnabled || route.tier!=='luna' || route.fallback || ['off_topic','store_help','catalog'].includes(route.intent)) return null;
  if (!signal || signal.scope!=='shopping' || !Number.isFinite(signal.confidence) || signal.confidence>=0.55 || !ESCALATION_REASONS.slice(1).includes(signal.escalationReason)) return null;
  if (signal.escalationReason==='low_confidence' && !['styling','fit','comparison','photo_styling'].includes(route.intent)) return null;
  return {...route,model:config.advancedModel,tier:'terra',reasoningEffort:'low',escalated:true,escalationReason:signal.escalationReason};
}
