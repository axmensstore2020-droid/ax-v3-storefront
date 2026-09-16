import 'server-only';
import {hash} from './security.js';
const count = value => Number.isSafeInteger(value)&&value>=0 ? value : null;
// A strict projection: never accept customer content or upstream error bodies.
export function usageRecord({requestId,sessionId,conversationId,secret,event='response',route={},data,latencyMs,success,errorCode=null}) {
  const details=data?.usage?.input_tokens_details;
  return {request_id:requestId,session_id:hash('usage:'+sessionId,secret),conversation_id:hash('conversation:'+conversationId,secret),
    event,created_at:new Date().toISOString(),model:route.model || null,tier:route.tier || null,intent:route.intent || 'conversation',
    reasoning_effort:route.reasoningEffort || null,escalated:Boolean(route.escalated),escalation_reason:route.escalationReason || 'none',fallback:Boolean(route.fallback),
    input_tokens:count(data?.usage?.input_tokens),cached_input_tokens:count(details?.cached_tokens),cache_write_tokens:count(details?.cache_write_tokens),output_tokens:count(data?.usage?.output_tokens),
    latency_ms:Math.max(0,Math.round(latencyMs || 0)),success:Boolean(success),error_code:['provider','incomplete','catalog','request','quota'].includes(errorCode)?errorCode:null};
}
export function createUsage({db,config,...identity}) {
  const records=[];
  return {
    record:event=>{ if(config.usageEnabled) records.push(usageRecord({...identity,...event})); },
    flush:async()=>{if (!records.length) return; try {await db.writeUsage(records);} catch { for(const record of records) console.warn('AX Stylist usage',JSON.stringify(record)); } }
  };
}
