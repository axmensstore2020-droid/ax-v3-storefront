import test from 'node:test';
import assert from 'node:assert/strict';
import {seal,unseal,getSession,historyToken,historyFromToken,sameOrigin,validateImage,hash} from '../lib/stylist/security.js';
import {createDatabase,databaseConfigured} from '../lib/stylist/database.js';
import {createOpenAI} from '../lib/stylist/openai.js';
import {searchExpression,productFacts,stylistSkuQuery} from '../lib/stylist/catalog.js';
const secret='test-only-signing-secret-not-for-deployment';

test('signed sessions reject tampering, wrong keys and expired cookies',()=>{
  const token=seal({kind:'session',id:'id',exp:Date.now()+60000},secret);
  assert.equal(unseal(token,secret).id,'id');assert.equal(unseal(token+'x',secret),null);
  assert.equal(unseal(token,secret+'bad'),null);assert.equal(unseal(seal({exp:1},secret),secret),null);
  assert.equal(getSession(new Request('https://ax.test/'),secret,false),null);
});
test('chat continuation is signed, session-bound and limited to six text messages',()=>{
  const token=historyToken(Array.from({length:9},()=>({role:'user',content:'hi',image:'private-image'})),'session-a',secret);
  const history=historyFromToken(token,'session-a',secret);assert.equal(history.length,6);assert.equal(history[0].image,undefined);
  assert.throws(()=>historyFromToken(token,'session-b',secret));assert.throws(()=>historyFromToken(token+'x','session-a',secret));
});
test('CSRF checks reject missing origin, malicious subdomain and cross-site requests',()=>{
  const make=(origin,site)=>new Request('https://ax.test/',{headers:{...(origin?{Origin:origin}:{}),...(site?{'Sec-Fetch-Site':site}:{})}});
  assert.equal(sameOrigin(make('https://ax.test'),'https://ax.test'),true);
  assert.equal(sameOrigin(make('https://ax.test.evil.test'),'https://ax.test'),false);
  assert.equal(sameOrigin(make(null),'https://ax.test'),false);
  assert.equal(sameOrigin(make('https://ax.test','cross-site'),'https://ax.test'),false);
});
test('photo inputs reject arbitrary URLs, SVGs, MIME spoofing and excessive payloads',()=>{
  assert.throws(()=>validateImage('https://127.0.0.1/private'));
  assert.throws(()=>validateImage('data:image/svg+xml;base64,PHN2Zz4='));
  assert.throws(()=>validateImage('data:image/png;base64,'+Buffer.from('not a real image').toString('base64')));
  assert.throws(()=>validateImage('data:image/png;base64,'+Buffer.alloc(1500001).toString('base64')));
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(12)]);
  assert.ok(validateImage('data:image/png;base64,'+png.toString('base64')));
});
test('catalog search quotes customer words instead of accepting search operators',()=>{
  assert.equal(searchExpression('linen',2000),'available_for_sale:true AND ("linen") AND variants.price:<=2000');
  assert.ok(!searchExpression('linen OR available_for_sale:false').includes('available_for_sale:false'));
  assert.match(searchExpression('AX-SHT-004'),/tag:"AX-SHT-004"/);
  assert.ok(!searchExpression('AX-SHT-004').includes('sku:'));
  assert.match(stylistSkuQuery,/VARIANTS_SKU/);
});
test('catalog facts discard payment helpers and unsafe image links',()=>{
  assert.equal(productFacts({title:'Partial Payment'}),null);
  const p=productFacts({title:'Shirt',handle:'shirt',tags:[],featuredImage:{url:'http://private.test/picture'}});
  assert.equal(p.image,'');assert.equal(p.href,'/products/shirt');
});
test('database calls are server-only, no-store, hashed and consent-limited',async()=>{
  const requests=[];
  const env={SUPABASE_URL:'https://test-project.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test-only',SUPABASE_SERVICE_ROLE_KEY:'legacy-key',AX_STYLIST_SECRET:secret};
  const db=createDatabase(env,async(url,init)=>{requests.push({url,init});return Response.json(url.includes('/rpc/')?true:[]);});
  assert.equal(databaseConfigured(env),true);
  assert.equal(await db.reserve('visitor'),true);
  await db.saveProfile('visitor',{unit:'cm',chest:94,email:'should-not-save'});
  const saved=JSON.parse(requests[1].init.body);
  assert.equal(saved.profile.email,undefined);assert.equal(saved.id,hash('profile:visitor',secret));
  assert.equal(requests[0].init.cache,'no-store');assert.ok(!requests[0].init.body.includes('"visitor"'));
  assert.equal(requests[0].init.headers.apikey,'sb_secret_test-only');
  assert.equal(requests[0].init.headers.Authorization,undefined);
  await db.deleteProfile('visitor');assert.equal(requests[2].init.method,'DELETE');
});
test('legacy Supabase variable accepts old JWTs and new Secret keys with appropriate headers',async()=>{
  for(const key of ['eyJ.test.signature','sb_secret_test-only']) {
    let headers;
    const env={SUPABASE_URL:'https://test-project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:key,AX_STYLIST_SECRET:secret};
    const db=createDatabase(env,async(url,init)=>{headers=init.headers;return Response.json(true);});
    assert.equal(databaseConfigured(env),true);
    assert.equal(await db.reserve('visitor'),true);
    assert.equal(headers.apikey,key);
    assert.equal(headers.Authorization,key === 'eyJ.test.signature' ? 'Bearer eyJ.test.signature' : undefined);
  }
});
test('database outages fail closed rather than bypassing the limiter',async()=>{
  const db=createDatabase({SUPABASE_URL:'https://test-project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test',AX_STYLIST_SECRET:secret},async()=>new Response('error',{status:500}));
  await assert.rejects(db.reserve('visitor'));
});
test('OpenAI uses Responses, no application-state storage and fixed server credentials',async()=>{
  let request;
  const ai=createOpenAI({OPENAI_API_KEY:'test-only-key'},async(url,init)=>{request={url,...init};return Response.json({status:'completed',output:[]});});
  await ai.respond({input:[{role:'user',content:'shirt'}]},'anonymous-hash');
  const body=JSON.parse(request.body);
  assert.equal(request.url,'https://api.openai.com/v1/responses');assert.equal(body.store,false);
  assert.equal(body.model,'gpt-5.6-luna');assert.equal(body.max_output_tokens,1000);
  assert.equal(body.safety_identifier,'anonymous-hash');assert.equal(body.previous_response_id,undefined);
});
test('upstream refusals, outages and incomplete responses do not leak diagnostics',async()=>{
  const ai=createOpenAI({OPENAI_API_KEY:'private'},async()=>new Response('secret internal details',{status:500}));
  await assert.rejects(ai.respond({},'hash'),error=>!error.message.includes('secret'));
  const incomplete=createOpenAI({OPENAI_API_KEY:'private'},async()=>Response.json({status:'incomplete',output:[]}));
  await assert.rejects(incomplete.respond({},'hash'),/incomplete/);
});
