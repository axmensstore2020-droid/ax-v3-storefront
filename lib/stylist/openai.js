import 'server-only';
import {stylistConfig} from './config.js';
import {routeAXStylistRequest} from './model-router.js';
export function createOpenAI(env = process.env, fetcher = fetch, signal, usage) {
  const config=stylistConfig(env);
  async function post(endpoint,body) {
    if (!env.OPENAI_API_KEY) throw new Error('AI is not configured.');
    const timeout = AbortSignal.timeout(20000);
    const response = await fetcher('https://api.openai.com/v1/'+endpoint,{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.OPENAI_API_KEY},
      body:JSON.stringify(body),cache:'no-store',signal:signal ? AbortSignal.any([timeout,signal]) : timeout
    });
    if (!response.ok) throw new Error('AI service unavailable.');
    return response.json();
  }
  return {
    moderate:async(message,image='') => {
      const input=[{type:'text',text:message},...(image?[{type:'image_url',image_url:{url:image}}]:[])];
      const data=await post('moderations',{model:'omni-moderation-latest',input});
      if (!data.results?.length) throw new Error('Safety check unavailable.');
      return {flagged:data.results.some(r=>r.flagged),selfHarm:data.results.some(r=>r.categories?.['self-harm/intent']||r.categories?.['self-harm/instructions'])};
    },
    respond:async(body,safetyId,route=routeAXStylistRequest({},config)) => {
      const start=Date.now(); let data,success=false;
      try {
        // These fields are controlled exclusively by the server router.
        data=await post('responses',{...body,model:route.model,reasoning:{effort:route.reasoningEffort},
          max_output_tokens:route.tier==='terra'?config.advancedOutputTokens:config.maxOutputTokens,
          store:false,include:['reasoning.encrypted_content'],safety_identifier:safetyId,
          prompt_cache_options:{mode:'explicit'}});
        if(data.status!=='completed'||!Array.isArray(data.output)) throw new Error('AI response incomplete.');
        success=true; return data;
      } finally { usage?.record({route,data,latencyMs:Date.now()-start,success,errorCode:success?null:data?'incomplete':'provider'}); }
    }
  };
}
