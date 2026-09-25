import test from 'node:test';
import assert from 'node:assert/strict';
import {choosePlayroomMove,nextPlayroomAxMove,playroomEmpty,playroomOutcome,replayPlayroomRound,seededPlayroomRandom} from '../lib/playroom-game.js';
import {createPlayroomRound,createShopifyPlayroomDiscount,getPlayroomAxMove,nextPlayroomDay,playroomDiscountScopeReady,playroomStatusFromTokens,settlePlayroomRound} from '../lib/playroom-server.js';
import {sealEncryptedToken} from '../lib/sealed-token.js';

const env={
 SHOPIFY_STORE_DOMAIN:'ax-test.myshopify.com',
 SHOPIFY_API_VERSION:'2026-07',
 SHOPIFY_ADMIN_ACCESS_TOKEN:'shpat_'+('x'.repeat(40)),
 AX_PLAYROOM_SECRET:'s'.repeat(48)
};

function buildRound(first,seed){
 const board=Array(9).fill(''),moves=[],random=seededPlayroomRandom(seed);
 let turn=first,result=null;
 while(!result){
  const index=turn==='X'?choosePlayroomMove(board,random):playroomEmpty(board)[0];
  board[index]=turn;moves.push(index);
  result=playroomOutcome(board);
  turn=turn==='O'?'X':'O';
 }
 return {moves,result,board};
}

function replayState(first,moves){
 const board=Array(9).fill('');let turn=first;
 for(const index of moves){board[index]=turn;turn=turn==='O'?'X':'O';}
 return {board,turn,result:playroomOutcome(board)};
}

function findOutcomeRound(first,seed,target,moves=[]){
 const state=replayState(first,moves);
 if(state.result)return state.result.winner===target?moves:null;
 if(state.turn==='X'){
  const index=nextPlayroomAxMove({first,moves,seed});
  return findOutcomeRound(first,seed,target,[...moves,index]);
 }
 for(const index of playroomEmpty(state.board)){
  const found=findOutcomeRound(first,seed,target,[...moves,index]);
  if(found)return found;
 }
 return null;
}

function findDrawSeed(){
 for(let index=0;index<80;index++){
  const seed='bonus-draw-seed-'+index,moves=findOutcomeRound('O',seed,'draw');
  if(moves)return {seed,moves};
 }
 throw new Error('Could not find a deterministic Playroom draw seed.');
}

test('Playroom seeded opponent is deterministic and histories are verifiable',()=>{
 const seed='deterministic-seed-2026';
 const first=nextPlayroomAxMove({first:'X',moves:[],seed});
 const second=nextPlayroomAxMove({first:'X',moves:[],seed});
 assert.equal(first,second);
 const round=buildRound('O',seed);
 const replay=replayPlayroomRound({first:'O',moves:round.moves,seed});
 assert.equal(replay.result.winner,round.result.winner);
 assert.deepEqual(replay.board,round.board);
});

test('Playroom rejects a forged AX move',()=>{
 const seed='forgery-check-seed';
 const expected=nextPlayroomAxMove({first:'O',moves:[0],seed});
 const forged=[1,2,3,4,5,6,7,8].find(index=>index!==expected);
 assert.throws(()=>nextPlayroomAxMove({first:'O',moves:[0,forged],seed}),/could not be verified/);
});

test('official Playroom session keeps the AI seed server-side',()=>{
 const round=createPlayroomRound('X',{env,now:Date.parse('2026-09-23T12:00:00Z')});
 assert.match(round.token,/^pxg1\./);
 const move=getPlayroomAxMove(round.token,[],{env,now:Date.parse('2026-09-23T12:00:01Z')});
 assert.ok(Number.isInteger(move)&&move>=0&&move<=8);
});

test('loss cooldown unlocks at the next India calendar day',()=>{
 const now=Date.parse('2026-09-23T18:00:00Z');
 assert.equal(new Date(nextPlayroomDay(now)).toISOString(),'2026-09-23T18:30:00.000Z');
});

test('official Playroom fails closed unless Shopify grants write_discounts',async()=>{
 let query='';
 const fetchImpl=async(url,init)=>{
  query=JSON.parse(init.body).query;
  return Response.json({data:{currentAppInstallation:{accessScopes:[{handle:'read_products'},{handle:'write_discounts'}]}}});
 };
 const ready=await playroomDiscountScopeReady({env:{...env,SHOPIFY_ADMIN_ACCESS_TOKEN:'shpat_'+('y'.repeat(40))},fetchImpl,now:Date.parse('2026-09-23T11:00:00Z')});
 assert.equal(ready,true);
 assert.match(query,/currentAppInstallation/);
});

test('Shopify Playroom reward is 10 percent, single-use, seven-day and non-stackable',async()=>{
 let captured=null;
 const fetchImpl=async(url,init)=>{
  captured={url,body:JSON.parse(init.body),headers:init.headers};
  return Response.json({data:{discountCodeBasicCreate:{codeDiscountNode:{id:'gid://shopify/DiscountCodeNode/1'},userErrors:[]}}});
 };
 const now=Date.parse('2026-09-23T12:00:00Z');
 const reward=await createShopifyPlayroomDiscount('AXPLAY10-ABC123DEF0',{env,fetchImpl,now});
 assert.equal(reward.code,'AXPLAY10-ABC123DEF0');
 assert.match(captured.url,/\/admin\/api\/2026-07\/graphql\.json$/);
 const input=captured.body.variables.basicCodeDiscount;
 assert.equal(input.customerGets.value.percentage,0.1);
 assert.deepEqual(input.context,{all:'ALL'});
 assert.equal(input.customerGets.items.all,true);
 assert.equal(input.usageLimit,1);
 assert.equal(input.appliesOncePerCustomer,true);
 assert.deepEqual(input.combinesWith,{orderDiscounts:false,productDiscounts:false,shippingDiscounts:false});
 assert.equal(Date.parse(input.endsAt)-Date.parse(input.startsAt),7*24*60*60*1000);
});

test('launch Playroom reward activates at launch and expires at end of launch day',async()=>{
 let captured=null;
 const fetchImpl=async(url,init)=>{
  captured=JSON.parse(init.body).variables.basicCodeDiscount;
  return Response.json({data:{discountCodeBasicCreate:{codeDiscountNode:{id:'gid://shopify/DiscountCodeNode/launch'},userErrors:[]}}});
 };
 const now=Date.parse('2026-09-26T12:00:00Z');
 const reward=await createShopifyPlayroomDiscount('AXPLAY10-LAUNCH1234',{launch:true,env,fetchImpl,now});
 assert.equal(reward.startsAt,'2026-09-27T06:30:00.000Z');
 assert.equal(reward.endsAt,'2026-09-27T18:29:59.000Z');
 assert.equal(captured.startsAt,reward.startsAt);
 assert.equal(captured.endsAt,reward.endsAt);
 assert.ok(captured.tags.includes('launch-day'));
});

test('settled Playroom result maps to the verified board outcome',async()=>{
 const now=Date.parse('2026-09-23T12:00:00Z');
 const round=createPlayroomRound('O',{env,now});
 const built=buildRound('O',round.seed);
 const fetchImpl=async()=>Response.json({data:{discountCodeBasicCreate:{codeDiscountNode:{id:'gid://shopify/DiscountCodeNode/2'},userErrors:[]}}});
 const settled=await settlePlayroomRound(round.token,built.moves,{env,fetchImpl,now:now+60_000});
 const expected=built.result.winner==='O'?'win':built.result.winner==='X'?'loss':'draw';
 assert.equal(settled.outcome,expected);
 if(expected==='win')assert.match(settled.rewardCode,/^AXPLAY10-[A-F0-9]{10}$/);
 if(expected==='draw')assert.equal(settled.nextEligibleAt,null);
 if(expected==='loss')assert.ok(Date.parse(settled.nextEligibleAt)>now);
});


test('first draw grants exactly one signed Bonus Round and no immediate cooldown',async()=>{
 const now=Date.parse('2026-09-23T12:00:00Z'),{seed,moves}=findDrawSeed();
 const token=sealEncryptedToken({kind:'playroom-game',first:'O',seed,nonce:'abcdef1234567890',bonus:false,iat:now,exp:now+20*60*1000},env.AX_PLAYROOM_SECRET,'pxg1');
 const settled=await settlePlayroomRound(token,moves,{env,now:now+60_000});
 assert.equal(settled.outcome,'draw');
 assert.equal(settled.bonusAvailable,true);
 assert.ok(settled.bonusToken);
 assert.ok(settled.cooldownToken);
 assert.equal(settled.nextEligibleAt,null);
 const status=playroomStatusFromTokens(settled.cooldownToken,settled.bonusToken,{env,now:now+61_000});
 assert.equal(status.eligible,true);
 assert.equal(status.bonusAvailable,true);
 assert.equal(status.lastOutcome,'draw');
});

test('a draw in the Bonus Round ends the session until the next India day',async()=>{
 const now=Date.parse('2026-09-23T12:00:00Z'),{seed,moves}=findDrawSeed();
 const token=sealEncryptedToken({kind:'playroom-game',first:'O',seed,nonce:'fedcba0987654321',bonus:true,iat:now,exp:now+20*60*1000},env.AX_PLAYROOM_SECRET,'pxg1');
 const settled=await settlePlayroomRound(token,moves,{env,now:now+60_000});
 assert.equal(settled.outcome,'draw');
 assert.equal(settled.bonusAvailable,false);
 assert.equal(settled.bonusToken,null);
 assert.ok(settled.nextEligibleAt);
 const status=playroomStatusFromTokens(settled.cooldownToken,'',{env,now:now+61_000});
 assert.equal(status.eligible,false);
 assert.equal(status.bonusAvailable,false);
 assert.equal(status.lastOutcome,'draw');
});

test('Playroom round records whether it is the one Bonus Round',()=>{
 const normal=createPlayroomRound('O',{bonus:false,env,now:Date.parse('2026-09-23T12:00:00Z')});
 const bonus=createPlayroomRound('O',{bonus:true,env,now:Date.parse('2026-09-23T12:00:00Z')});
 assert.equal(normal.bonus,false);
 assert.equal(bonus.bonus,true);
});
