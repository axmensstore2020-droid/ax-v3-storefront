import test from 'node:test';
import assert from 'node:assert/strict';
import {stylistConfig} from '../lib/stylist/config.js';
import {routeAXStylistRequest,escalationRoute} from '../lib/stylist/model-router.js';
import {runStylist} from '../lib/stylist/assistant.js';
import {usageRecord,createUsage} from '../lib/stylist/usage.js';
import {createOpenAI} from '../lib/stylist/openai.js';
import {boundedHistory,compactContext,relevantProfile,toolContext} from '../lib/stylist/context.js';
const config=stylistConfig({});
const final=(extra={})=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({scope:'shopping',message:'Try cream with those trousers.',products:[],suggestions:[],helpLinks:[],confidence:0.9,escalationReason:'none',...extra})}]}]});
function fixture(message,responses,extra={}) {
  const routes=[],inputs=[];
  return {message,history:[],catalog:{},reserveAdvanced:async()=>true,config,ai:{moderate:async()=>({flagged:false}),respond:async(input,id,route)=>{inputs.push(structuredClone(input));routes.push(route);const r=responses.shift();if(r instanceof Error)throw r;return r;}},routes,inputs,...extra};
}
test('routine requests including photos and followups stay on Luna',()=>{
  for(const message of ['Hi','Show me black shirts','Show cargos under ₹2000','Do you have this in M?','Which color goes with these pants?','What goes with this?','What should I wear for a date?','What colors are trending?','Compare these two shirts','When do you open?','How do I return a shirt?','What about beige?']) {
    const route=routeAXStylistRequest({message},config);assert.equal(route.model,'gpt-5.6-luna',message);assert.ok(['none','low'].includes(route.reasoningEffort));
  }
  for(const message of ['What color is this?','What AX pants match this shirt?','Would black or beige work better?','What garment is this?']) assert.equal(routeAXStylistRequest({message,image:'photo'},config).tier,'luna',message);
});
test('catalog requests without a PDP product force live product search first',async()=>{
  const f=fixture('Jacket',[final({message:'No jackets found.'})]);
  await runStylist(f);
  assert.deepEqual(f.inputs[0].tool_choice,{type:'function',name:'search_products'});
  assert.equal(f.routes[0].intent,'catalog');
});
test('genuinely complex styling escalates, with medium reserved for compound complexity',()=>{
  for(const context of [{message:'Build an entire outfit using AX pieces'},{message:'Analyze my overall outfit',image:'photo'},{message:'Recommend sizing between M and L for chest 94 waist 78 hip 96'},{message:'Compare five shirts for the office, avoid navy'},{message:'Style an office outfit under 3000 for humid weather, avoid prints'}]) assert.equal(routeAXStylistRequest(context,config).tier,'terra',context.message);
  assert.equal(routeAXStylistRequest({message:'Build an entire outfit'},config).reasoningEffort,'low');
  assert.equal(routeAXStylistRequest({message:'Build a complete outfit for an office party under 3000 in humid weather, avoid prints'},config).reasoningEffort,'medium');
  assert.equal(routeAXStylistRequest({message:'Build an entire outfit'},stylistConfig({AX_STYLIST_ADVANCED_ENABLED:'false'})).tier,'luna');
});
test('ordinary non-store questions cannot escalate even with photo or low confidence',()=>{
  const route=routeAXStylistRequest({message:'Write python code to do mathematics',image:'photo'},config);
  assert.equal(route.intent,'off_topic');assert.equal(route.tier,'luna');
  assert.equal(escalationRoute(route,{scope:'shopping',confidence:0.1,escalationReason:'low_confidence'},config),null);
});
test('low-confidence Luna is silently replaced once by Terra, without leaking the draft',async()=>{
  const f=fixture('Help me style this',[final({message:'PRIVATE DRAFT',confidence:0.3,escalationReason:'multi_constraint_styling'}),final({message:'Final outfit advice.'})]);
  const result=await runStylist(f);assert.equal(result.message,'Final outfit advice.');assert.deepEqual(f.routes.map(r=>r.tier),['luna','terra']);
  assert.ok(!JSON.stringify(f.inputs[1]).includes('PRIVATE DRAFT'));assert.ok(!JSON.stringify(result).includes('terra'));
});
test('advanced outage falls back once to Luna without retry loops',async()=>{
  const f=fixture('Build an entire outfit',[new Error('secret provider body'),final({message:'What occasion do you have in mind?'})]);
  const result=await runStylist(f);assert.equal(result.message,'What occasion do you have in mind?');assert.deepEqual(f.routes.map(r=>r.tier),['terra','luna']);assert.equal(f.routes[1].fallback,true);
  const broken=fixture('Build an entire outfit',[new Error('fail'),new Error('fail')]);await assert.rejects(runStylist(broken));assert.equal(broken.routes.length,2);
});
test('advanced reservations fail closed and disabled routing never spends on Terra',async()=>{
  for(const reserveAdvanced of [async()=>false,async()=>{throw new Error('database unavailable');}]) {
    const f=fixture('Build an entire outfit',[final()],{reserveAdvanced});await runStylist(f);assert.deepEqual(f.routes.map(r=>r.tier),['luna']);
  }
  const f=fixture('Help me style this',[final({confidence:0.2,escalationReason:'low_confidence'})],{reserveAdvanced:async()=>false});await runStylist(f);assert.equal(f.routes.length,1);
});
test('off-topic redirects vary, and do not invoke Responses',async()=>{
  const f=fixture('Do my algebra homework',[]);const first=await runStylist(f);
  const second=await runStylist({...f,history:[{role:'assistant',content:first.message}]});
  assert.notEqual(first.message,second.message);assert.equal(f.routes.length,0);
});
test('simple greetings get a local welcome and do not spend a Responses call',async()=>{
  const f=fixture('Hi',[]);const result=await runStylist(f);
  assert.equal(result.message,'Hi! What are you looking for today—an outfit, a specific piece, or help with fit?');
  assert.deepEqual(result.products,[]);assert.equal(f.routes.length,0);assert.equal(f.inputs.length,0);
});
test('only selected profile fields and bounded history/products reach context',()=>{
  const p={unit:'cm',chest:94,styles:'old money',colors:'sage',avoid:'neon',email:'private'};
  assert.deepEqual(relevantProfile(p,'catalog'),{});assert.equal(relevantProfile(p,'styling').chest,undefined);assert.equal(relevantProfile(p,'fit').chest,94);
  const history=Array.from({length:20},(_,i)=>({role:'user',content:`I prefer ${i} `+'x'.repeat(1000)}));
  const bounded=boundedHistory(history,config);assert.ok(bounded.length<=6);assert.ok(bounded.reduce((n,m)=>n+m.content.length,0)<=4800);
  assert.ok(compactContext('',history,config).length<=700);
  const small=toolContext({products:Array.from({length:100},(_,i)=>({handle:'product-'+i,description:'description',variants:[]}))},config);assert.equal(JSON.parse(small).products.length,6);
  assert.equal(JSON.parse(toolContext({data:'x'.repeat(99999)},config)).truncated,true);
});
test('usage contains identifiers, tokens and intent but no prompt/profile/secret',async()=>{
  const identity={requestId:'123',sessionId:'raw-session',conversationId:'raw-chat',secret:'never-log-this'};
  const route=routeAXStylistRequest({message:'hello'},config);
  const record=usageRecord({...identity,route,data:{usage:{input_tokens:200,cached_input_tokens:1,input_tokens_details:{cached_tokens:100,cache_write_tokens:20},output_tokens:30}},latencyMs:123,success:true,message:'sensitive',profile:{chest:94}});
  assert.equal(record.cached_input_tokens,100);assert.equal(record.cache_write_tokens,20);assert.equal(record.output_tokens,30);assert.equal(record.session_id.length,64);
  assert.ok(!/sensitive|never-log|chest|raw-session|raw-chat/.test(JSON.stringify(record)));
  let saved;const usage=createUsage({...identity,config,db:{writeUsage:async rows=>{saved=rows;}}});usage.record({route,success:true});await usage.flush();assert.equal(saved.length,1);
});
test('server model selection and output caps cannot be overridden by body parameters',async()=>{
  const requests=[],records=[];
  const ai=createOpenAI({OPENAI_API_KEY:'secret'},async(url,init)=>{requests.push(JSON.parse(init.body));return Response.json({...final(),usage:{input_tokens:500,output_tokens:50,input_tokens_details:{cached_tokens:400}}});},undefined,{record:r=>records.push(r)});
  await ai.respond({model:'evil',store:true,max_output_tokens:999999,reasoning:{effort:'high'}},'id',routeAXStylistRequest({message:'hi'},config));
  assert.equal(requests[0].model,'gpt-5.6-luna');assert.equal(requests[0].reasoning.effort,'none');assert.equal(requests[0].max_output_tokens,1000);assert.equal(requests[0].store,false);assert.deepEqual(requests[0].prompt_cache_options,{mode:'explicit'});
  assert.equal(records[0].success,true);assert.equal(records[0].data.usage.input_tokens,500);
});
