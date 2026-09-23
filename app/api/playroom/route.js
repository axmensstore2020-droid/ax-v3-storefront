import {NextResponse} from 'next/server';
import {assertAllowedKeys} from '../../../lib/request-body.js';
import {cookieValue,PLAYROOM_GUARD_COOKIE,readLimitedJson,reservePlayroomBurst,sameOriginRequest} from '../../../lib/request-security.js';
import {createPlayroomRound,getPlayroomAxMove,PLAYROOM_COOLDOWN_COOKIE,PLAYROOM_GAME_COOKIE,PLAYROOM_GAME_MAX_AGE,playroomDiscountScopeReady,playroomStatusFromToken,settlePlayroomRound} from '../../../lib/playroom-server.js';

export const dynamic='force-dynamic';

const cookieBase={httpOnly:true,sameSite:'strict',path:'/'};
const secure=()=>process.env.NODE_ENV==='production';

function json(body,status=200,guard=null){
  const response=NextResponse.json(body,{status,headers:{'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'}});
  if(guard?.setCookie&&guard.token)response.cookies.set(PLAYROOM_GUARD_COOKIE,guard.token,{...cookieBase,secure:secure(),maxAge:60*60});
  return response;
}

export async function GET(request){
  const cooldown=cookieValue(request,PLAYROOM_COOLDOWN_COOKIE),status=playroomStatusFromToken(cooldown);
  if(!status.available)return json(status);
  if(!(await playroomDiscountScopeReady()))return json({available:false,eligible:false,nextEligibleAt:null,lastOutcome:null});
  return json(status);
}

export async function POST(request){
  const requestOrigin=new URL(request.url).origin,configuredOrigin=process.env.AX_SITE_ORIGIN;
  const originAllowed=(configuredOrigin&&sameOriginRequest(request,configuredOrigin))||sameOriginRequest(request,requestOrigin);
  if(!originAllowed)return json({ok:false,error:'Please use the AX store.'},403);
  const guard=reservePlayroomBurst(request,{limit:20,windowMs:60_000});
  if(!guard.allowed)return json({ok:false,error:'Too many Playroom requests. Try again shortly.'},429,guard);

  let body;
  try{body=await readLimitedJson(request,2048);assertAllowedKeys(body,['action','first','moves'],'Playroom');}
  catch(error){return json({ok:false,error:error.message||'Invalid Playroom request.'},400,guard);}

  if(body.action==='start'){
    const status=playroomStatusFromToken(cookieValue(request,PLAYROOM_COOLDOWN_COOKIE));
    if(!status.available)return json({ok:false,error:'AX Playroom rewards are not available yet.'},503,guard);
    if(!status.eligible)return json({ok:false,error:'Your next Playroom round is not ready yet.',nextEligibleAt:status.nextEligibleAt,lastOutcome:status.lastOutcome},409,guard);
    if(!(await playroomDiscountScopeReady()))return json({ok:false,error:'AX Playroom rewards are not enabled in Shopify yet.'},503,guard);
    try{
      const round=createPlayroomRound(body.first);
      const response=json({ok:true,expiresAt:round.expiresAt},200,guard);
      response.cookies.set(PLAYROOM_GAME_COOKIE,round.token,{...cookieBase,secure:secure(),maxAge:PLAYROOM_GAME_MAX_AGE});
      return response;
    }catch(error){return json({ok:false,error:error.message||'The round could not start.'},503,guard);}
  }

  if(body.action==='move'){
    if(!Array.isArray(body.moves))return json({ok:false,error:'Invalid Playroom move history.'},400,guard);
    const token=cookieValue(request,PLAYROOM_GAME_COOKIE);
    if(!token)return json({ok:false,error:'This Playroom round expired. Start a new round.'},409,guard);
    try{
      const index=getPlayroomAxMove(token,body.moves);
      return json({ok:true,index},200,guard);
    }catch(error){
      return json({ok:false,error:error.message||'AX could not make a move.'},409,guard);
    }
  }

  if(body.action==='finish'){
    if(!Array.isArray(body.moves))return json({ok:false,error:'Invalid Playroom move history.'},400,guard);
    const token=cookieValue(request,PLAYROOM_GAME_COOKIE);
    if(!token)return json({ok:false,error:'This Playroom round expired. Start a new round.'},409,guard);
    try{
      const settled=await settlePlayroomRound(token,body.moves);
      const response=json({ok:true,outcome:settled.outcome,rewardCode:settled.rewardCode,rewardEndsAt:settled.rewardEndsAt,nextEligibleAt:settled.nextEligibleAt},200,guard);
      response.cookies.set(PLAYROOM_GAME_COOKIE,'',{...cookieBase,secure:secure(),maxAge:0});
      if(settled.cooldownToken&&settled.nextEligibleAt){
        const maxAge=Math.max(1,Math.ceil((Date.parse(settled.nextEligibleAt)-Date.now())/1000));
        response.cookies.set(PLAYROOM_COOLDOWN_COOKIE,settled.cooldownToken,{...cookieBase,secure:secure(),maxAge});
      }
      return response;
    }catch(error){
      return json({ok:false,error:error.message||'The Playroom result could not be verified.'},error.message?.includes('reward')||error.message?.includes('configured')?503:409,guard);
    }
  }

  return json({ok:false,error:'Unsupported Playroom action.'},400,guard);
}
