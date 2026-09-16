import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV='test';
process.env.SHOPIFY_STORE_DOMAIN='test-store.myshopify.com';
process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN='test-only-shopify';
process.env.AX_STYLIST_ENABLED='true';
process.env.AX_STYLIST_SECRET='test-only-stylist-secret-with-32-characters';
process.env.AX_SITE_ORIGIN='https://ax.test';
process.env.OPENAI_API_KEY='test-only-ai';
process.env.SUPABASE_URL='https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-db';
const chat=await import('../app/api/stylist/route.js');
const profile=await import('../app/api/stylist/profile/route.js');
const {CONSENT_VERSION}=await import('../lib/stylist/validation.js');
const {historyFromToken}=await import('../lib/stylist/security.js');
const originalFetch=globalThis.fetch;
const request=(body,method='POST',cookie='',origin='https://ax.test')=>new Request('https://ax.test/api/stylist',{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(method==='GET'?{}:{body:body===undefined?undefined:JSON.stringify(body)})});
function mockServices(t,{reserve=true}={}) {
  const calls=[],rows=new Map();
  t.after(()=>{globalThis.fetch=originalFetch;});
  globalThis.fetch=async(url,options={})=>{
    calls.push({url,options});
    if(url.endsWith('/rpc/ax_stylist_reserve'))return Response.json(reserve);
    if(url.includes('/rest/v1/ax_stylist_usage'))return Response.json([]);
    if(url.includes('/rest/v1/ax_stylist_profiles')){
      if(options.method==='POST'){const data=JSON.parse(options.body);rows.set(data.id,data);return Response.json([data]);}
      const id=new URL(url).searchParams.get('id')?.slice(3);
      if(options.method==='DELETE'){rows.delete(id);return new Response(null,{status:204});}
      return Response.json(rows.has(id)?[rows.get(id)]:[]);
    }
    if(url.endsWith('/moderations'))return Response.json({results:[{flagged:false,categories:{}}]});
    if(url.endsWith('/responses'))return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({scope:'off_topic',message:'arbitrary answer',products:[],suggestions:[],helpLinks:[]})}]}]});
    throw new Error('Unexpected outbound call in test: '+url);
  };
  return {calls,rows};
}
test('cross-site and unconsented requests never reach any provider',async t=>{
  const mock=mockServices(t);
  assert.equal((await chat.POST(request({message:'hi',consent:true},'POST','','https://evil.test'))).status,403);
  assert.equal((await chat.POST(request({message:'hi'}))).status,400);
  assert.equal(mock.calls.length,0);
});
test('chat sets an HttpOnly session and returns only signed continuation',async t=>{
  const mock=mockServices(t);
  const response=await chat.POST(request({message:'Explain physics',consent:true}));
  assert.equal(response.status,200);assert.match(response.headers.get('Set-Cookie'),/HttpOnly; SameSite=Strict/);
  assert.match(response.headers.get('Cache-Control'),/no-store/);
  const data=await response.json();assert.equal(data.scope,'off_topic');assert.ok(data.conversation);
  const raw=JSON.stringify(data);assert.ok(!raw.includes('test-only-ai'));assert.ok(!raw.includes('test-only-db'));
  assert.equal(mock.calls.filter(c=>c.url.endsWith('/responses')).length,0);
});
test('shared quota blocks before OpenAI calls even on a newly generated cookie',async t=>{
  const mock=mockServices(t,{reserve:false});
  assert.equal((await chat.POST(request({message:'shirt',consent:true}))).status,429);
  assert.equal(mock.calls.length,1);assert.match(mock.calls[0].url,/reserve/);
});
test('private profile requires consent, round trips and deletes from the same anonymous session',async t=>{
  const mock=mockServices(t);
  assert.equal((await profile.POST(request({profile:{unit:'cm',chest:94}}))).status,400);
  const saved=await profile.POST(request({profile:{unit:'cm',chest:94},consent:true,consentVersion:CONSENT_VERSION}));
  assert.equal(saved.status,200);const cookie=saved.headers.get('set-cookie').split(';')[0];
  assert.equal(mock.rows.size,1);
  const loaded=await (await profile.GET(request(undefined,'GET',cookie))).json();assert.equal(loaded.profile.chest,94);
  const unrelated=await (await profile.GET(request(undefined,'GET'))).json();assert.equal(unrelated.profile,null);
  assert.equal((await profile.DELETE(request(undefined,'DELETE',cookie))).status,200);assert.equal(mock.rows.size,0);
  const after=await (await profile.GET(request(undefined,'GET',cookie))).json();assert.equal(after.profile,null);
});
test('detected secret text is not carried into a later signed conversation',async t=>{
  const mock=mockServices(t);
  const response=await chat.POST(request({message:'my card is 4111111111111111',consent:true}));
  const data=await response.json();assert.equal(data.excludeFromHistory,true);
  const cookie=response.headers.get('set-cookie').split(';')[0];
  const {getSession}=await import('../lib/stylist/security.js');
  const session=getSession(request(undefined,'GET',cookie),process.env.AX_STYLIST_SECRET,false);
  assert.deepEqual(historyFromToken(data.conversation,session.id,process.env.AX_STYLIST_SECRET),[]);
  assert.ok(mock.calls.every(c=>!c.url.startsWith('https://api.openai.com/')));
});
test('profile deletion remains available with AI disabled',async t=>{
  mockServices(t);process.env.AX_STYLIST_ENABLED='false';t.after(()=>{process.env.AX_STYLIST_ENABLED='true';});
  assert.equal((await chat.POST(request({message:'hi',consent:true}))).status,503);
  assert.equal((await profile.DELETE(request(undefined,'DELETE'))).status,200);
});
