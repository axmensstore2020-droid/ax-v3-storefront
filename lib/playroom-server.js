import 'server-only';
import {randomBytes,createHash} from 'node:crypto';
import {sealEncryptedToken,unsealEncryptedToken} from './sealed-token.js';
import {nextPlayroomAxMove,replayPlayroomRound} from './playroom-game.js';

export const PLAYROOM_GAME_COOKIE='ax_playroom_game';
export const PLAYROOM_COOLDOWN_COOKIE='ax_playroom_cooldown';
export const PLAYROOM_BONUS_COOKIE='ax_playroom_bonus';
export const PLAYROOM_GAME_MAX_AGE=20*60;
export const PLAYROOM_WIN_COOLDOWN_MS=7*24*60*60*1000;

let adminTokenCache={key:'',token:'',expiresAt:0};
let discountScopeCache={key:'',ready:false,expiresAt:0};
const clean=(value,max=320)=>String(value||'').trim().slice(0,max);

export function playroomConfig(env=process.env){
  const domain=clean(env.SHOPIFY_STORE_DOMAIN,180).toLowerCase();
  const apiVersion=clean(env.SHOPIFY_API_VERSION||'2026-07',20);
  const adminToken=clean(env.SHOPIFY_ADMIN_ACCESS_TOKEN,320);
  const adminClientId=clean(env.SHOPIFY_CLIENT_ID,180);
  const adminClientSecret=String(env.SHOPIFY_CLIENT_SECRET||'').trim();
  const secret=String(env.AX_PLAYROOM_SECRET||env.AX_STYLIST_SECRET||'');
  const adminReady=Boolean(adminToken||(adminClientId&&adminClientSecret));
  return {domain,apiVersion,adminToken,adminClientId,adminClientSecret,secret,ready:Boolean(/^[a-z0-9-]+\.myshopify\.com$/.test(domain)&&adminReady&&secret.length>=32)};
}

export function playroomConfigured(env=process.env){return playroomConfig(env).ready;}

function tokenCacheKey(config){
  return createHash('sha256').update([config.domain,config.adminClientId,config.adminClientSecret].join('\0')).digest('hex');
}

async function getAdminToken(config,{fetchImpl=fetch,now=Date.now()}={}){
  if(config.adminToken)return config.adminToken;
  const key=tokenCacheKey(config);
  if(adminTokenCache.key===key&&adminTokenCache.token&&now<adminTokenCache.expiresAt-60_000)return adminTokenCache.token;
  const response=await fetchImpl(`https://${config.domain}/admin/oauth/access_token`,{
    method:'POST',
    headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'client_credentials',client_id:config.adminClientId,client_secret:config.adminClientSecret}).toString(),
    cache:'no-store',
    signal:AbortSignal.timeout(10000)
  });
  let data;try{data=await response.json();}catch{data=null;}
  const token=clean(data?.access_token,320),expiresIn=Number(data?.expires_in);
  if(!response.ok||token.length<20||!Number.isFinite(expiresIn)||expiresIn<60)throw new Error('Playroom reward service is unavailable.');
  adminTokenCache={key,token,expiresAt:now+Math.min(expiresIn,86400)*1000};
  return token;
}

async function adminGraphql(query,variables,config,{fetchImpl=fetch,now=Date.now()}={}){
  const accessToken=await getAdminToken(config,{fetchImpl,now});
  const response=await fetchImpl(`https://${config.domain}/admin/api/${config.apiVersion}/graphql.json`,{
    method:'POST',
    headers:{Accept:'application/json','Content-Type':'application/json','X-Shopify-Access-Token':accessToken},
    body:JSON.stringify({query,variables}),
    cache:'no-store',
    signal:AbortSignal.timeout(12000)
  });
  let json;try{json=await response.json();}catch{json=null;}
  if(!response.ok||!json||json.errors?.length)throw new Error('Playroom reward service is unavailable.');
  return json.data;
}

export async function playroomDiscountScopeReady({env=process.env,fetchImpl=fetch,now=Date.now()}={}){
  const config=playroomConfig(env);
  if(!config.ready)return false;
  const key=createHash('sha256').update([config.domain,config.adminToken,config.adminClientId,config.adminClientSecret].join('\0')).digest('hex');
  if(discountScopeCache.key===key&&now<discountScopeCache.expiresAt)return discountScopeCache.ready;
  let ready=false;
  try{
    const data=await adminGraphql('query AXPlayroomScopes{currentAppInstallation{accessScopes{handle}}}',{},config,{fetchImpl,now});
    ready=Boolean(data?.currentAppInstallation?.accessScopes?.some(scope=>scope?.handle==='write_discounts'));
  }catch{ready=false;}
  discountScopeCache={key,ready,expiresAt:now+5*60_000};
  return ready;
}

export function nextPlayroomDay(now=Date.now()){
  const istOffset=330*60*1000;
  const local=new Date(now+istOffset);
  return Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()+1)-istOffset;
}

export function unsealPlayroomCooldown(token,secret,now=Date.now()){
  return unsealEncryptedToken(token,secret,{
    prefix:'pxc1',minLength:30,maxLength:4000,
    validate:value=>value?.kind==='playroom-cooldown'&&['win','loss','draw'].includes(value.outcome)&&Number(value.exp)>now
  });
}

export function unsealPlayroomBonus(token,secret,now=Date.now()){
  return unsealEncryptedToken(token,secret,{
    prefix:'pxb1',minLength:30,maxLength:4000,
    validate:value=>value?.kind==='playroom-bonus'&&value.available===true&&Number(value.exp)>now
  });
}

export function playroomStatusFromTokens(cooldownToken,bonusToken,{env=process.env,now=Date.now()}={}){
  const config=playroomConfig(env);
  if(!config.ready)return {available:false,eligible:false,bonusAvailable:false,nextEligibleAt:null,lastOutcome:null};
  const cooldown=unsealPlayroomCooldown(cooldownToken,config.secret,now);
  if(!cooldown)return {available:true,eligible:true,bonusAvailable:false,nextEligibleAt:null,lastOutcome:null};
  const nextEligibleAt=new Date(cooldown.exp).toISOString();
  if(cooldown.outcome==='draw'){
    const bonus=unsealPlayroomBonus(bonusToken,config.secret,now);
    if(bonus)return {available:true,eligible:true,bonusAvailable:true,nextEligibleAt,lastOutcome:'draw'};
  }
  return {available:true,eligible:false,bonusAvailable:false,nextEligibleAt,lastOutcome:cooldown.outcome};
}

export function playroomStatusFromToken(token,options={}){return playroomStatusFromTokens(token,'',options);}

export function createPlayroomRound(first,{bonus=false,env=process.env,now=Date.now()}={}){
  const config=playroomConfig(env);
  if(!config.ready)throw new Error('AX Playroom rewards are not configured yet.');
  if(first!=='O'&&first!=='X')throw new Error('Choose who makes the first move.');
  const seed=randomBytes(16).toString('hex'),nonce=randomBytes(12).toString('hex'),exp=now+PLAYROOM_GAME_MAX_AGE*1000;
  const token=sealEncryptedToken({kind:'playroom-game',first,seed,nonce,bonus:Boolean(bonus),iat:now,exp},config.secret,'pxg1');
  return {seed,token,bonus:Boolean(bonus),expiresAt:new Date(exp).toISOString()};
}

function unsealRound(token,secret,now){
  return unsealEncryptedToken(token,secret,{
    prefix:'pxg1',minLength:30,maxLength:5000,
    validate:value=>value?.kind==='playroom-game'&&(value.first==='O'||value.first==='X')&&typeof value.seed==='string'&&typeof value.nonce==='string'&&typeof value.bonus==='boolean'&&Number(value.exp)>now
  });
}

export function getPlayroomAxMove(token,moves,{env=process.env,now=Date.now()}={}){
  const config=playroomConfig(env);
  if(!config.ready)throw new Error('AX Playroom rewards are not configured yet.');
  const session=unsealRound(token,config.secret,now);
  if(!session)throw new Error('This Playroom round expired. Start a new round.');
  return nextPlayroomAxMove({first:session.first,moves,seed:session.seed});
}

const DISCOUNT_CREATE=`mutation CreateAXPlayroomDiscount($basicCodeDiscount:DiscountCodeBasicInput!){
  discountCodeBasicCreate(basicCodeDiscount:$basicCodeDiscount){
    codeDiscountNode{id}
    userErrors{field code message}
  }
}`;

export async function createShopifyPlayroomDiscount(code,{env=process.env,fetchImpl=fetch,now=Date.now()}={}){
  const config=playroomConfig(env);
  if(!config.ready)throw new Error('AX Playroom rewards are not configured yet.');
  const startsAt=new Date(now).toISOString(),endsAt=new Date(now+PLAYROOM_WIN_COOLDOWN_MS).toISOString();
  const input={
    title:`AX Playroom · 10% win · ${code.slice(-10)}`,
    code,
    context:{all:'ALL'},
    customerGets:{items:{all:true},value:{percentage:0.1}},
    startsAt,endsAt,usageLimit:1,appliesOncePerCustomer:true,
    combinesWith:{orderDiscounts:false,productDiscounts:false,shippingDiscounts:false},
    tags:['ax-playroom','10-percent']
  };
  const data=await adminGraphql(DISCOUNT_CREATE,{basicCodeDiscount:input},config,{fetchImpl,now});
  const payload=data?.discountCodeBasicCreate,errors=Array.isArray(payload?.userErrors)?payload.userErrors:[];
  if(errors.length){
    const duplicate=errors.every(error=>/already|taken|exists|unique/i.test(String(error?.message||'')));
    if(!duplicate)throw new Error('AX could not issue the Playroom reward. Please try again.');
  }
  if(!payload?.codeDiscountNode?.id&&!errors.length)throw new Error('AX could not issue the Playroom reward. Please try again.');
  return {code,startsAt,endsAt,id:payload?.codeDiscountNode?.id||null};
}

export async function settlePlayroomRound(token,moves,{env=process.env,fetchImpl=fetch,now=Date.now()}={}){
  const config=playroomConfig(env);
  if(!config.ready)throw new Error('AX Playroom rewards are not configured yet.');
  const session=unsealRound(token,config.secret,now);
  if(!session)throw new Error('This Playroom round expired. Start a new round.');
  const {result}=replayPlayroomRound({first:session.first,moves,seed:session.seed});
  if(result.winner==='draw'){
    const exp=nextPlayroomDay(now);
    const cooldownToken=sealEncryptedToken({kind:'playroom-cooldown',outcome:'draw',iat:now,exp},config.secret,'pxc1');
    if(session.bonus)return {outcome:'draw',bonusAvailable:false,rewardCode:null,rewardEndsAt:null,bonusToken:null,cooldownToken,cooldownEndsAt:new Date(exp).toISOString(),nextEligibleAt:new Date(exp).toISOString()};
    const bonusToken=sealEncryptedToken({kind:'playroom-bonus',available:true,iat:now,exp},config.secret,'pxb1');
    return {outcome:'draw',bonusAvailable:true,rewardCode:null,rewardEndsAt:null,bonusToken,cooldownToken,cooldownEndsAt:new Date(exp).toISOString(),nextEligibleAt:null};
  }
  if(result.winner==='X'){
    const exp=nextPlayroomDay(now);
    const cooldownToken=sealEncryptedToken({kind:'playroom-cooldown',outcome:'loss',iat:now,exp},config.secret,'pxc1');
    return {outcome:'loss',bonusAvailable:false,rewardCode:null,rewardEndsAt:null,bonusToken:null,cooldownToken,cooldownEndsAt:new Date(exp).toISOString(),nextEligibleAt:new Date(exp).toISOString()};
  }
  const code=`AXPLAY10-${session.nonce.slice(0,10).toUpperCase()}`;
  const reward=await createShopifyPlayroomDiscount(code,{env,fetchImpl,now});
  const exp=now+PLAYROOM_WIN_COOLDOWN_MS;
  const cooldownToken=sealEncryptedToken({kind:'playroom-cooldown',outcome:'win',iat:now,exp},config.secret,'pxc1');
  return {outcome:'win',bonusAvailable:false,rewardCode:reward.code,rewardEndsAt:reward.endsAt,bonusToken:null,cooldownToken,cooldownEndsAt:new Date(exp).toISOString(),nextEligibleAt:new Date(exp).toISOString()};
}
