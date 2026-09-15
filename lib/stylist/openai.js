import 'server-only';

export function createOpenAI(env = process.env, fetcher = fetch, signal) {
  async function post(endpoint,body) {
    if (!env.OPENAI_API_KEY) throw new Error('AI is not configured.');
    const timeout = AbortSignal.timeout(25000);
    const response = await fetcher('https://api.openai.com/v1/'+endpoint,{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.OPENAI_API_KEY},
      body:JSON.stringify(body),cache:'no-store',signal:signal ? AbortSignal.any([timeout,signal]) : timeout
    });
    // Do not expose API errors, tokens, prompts or upstream response bodies.
    if (!response.ok) throw new Error(response.status === 429 ? 'AI is busy. Please try again shortly.' : 'AI service unavailable.');
    return response.json();
  }
  return {
    moderate:async(message,image='') => {
      const input = [{type:'text',text:message},...(image ? [{type:'image_url',image_url:{url:image}}] : [])];
      const data = await post('moderations',{model:'omni-moderation-latest',input});
      if (!data.results?.length) throw new Error('Safety check unavailable.');
      return {flagged:data.results.some(r => r.flagged),selfHarm:data.results.some(r => r.categories?.['self-harm/intent'] || r.categories?.['self-harm/instructions'])};
    },
    respond:async(body,safetyId) => {
      const data = await post('responses',{
        model:env.OPENAI_STYLIST_MODEL || 'gpt-5.6-terra',reasoning:{effort:'low'},
        max_output_tokens:1600,store:false,include:['reasoning.encrypted_content'],
        safety_identifier:safetyId,...body
      });
      if (data.status !== 'completed' || !Array.isArray(data.output)) throw new Error('AI response was incomplete. Please try a shorter request.');
      return data;
    }
  };
}
