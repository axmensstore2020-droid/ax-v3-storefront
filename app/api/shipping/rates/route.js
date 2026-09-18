import {timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {getDelhiveryCheckoutRates} from '../../../../lib/delhivery.js';
import {readLimitedJson} from '../../../../lib/request-security.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const MAX_RATE_BODY_BYTES=65536;

function respond(data,status=200) {
  return NextResponse.json(data,{status,headers:{
    'Cache-Control':'no-store, private',
    'X-Content-Type-Options':'nosniff',
    'Cross-Origin-Resource-Policy':'same-origin'
  }});
}

function callbackAuth(request) {
  const expected=String(process.env.AX_SHIPPING_CALLBACK_SECRET || '').trim();
  if(expected.length<24) return {configured:false,authorized:false};
  const supplied=new URL(request.url).searchParams.get('key') || '';
  const left=Buffer.from(expected);
  const right=Buffer.from(supplied);
  return {
    configured:true,
    authorized:left.length===right.length && timingSafeEqual(left,right)
  };
}

export async function POST(request) {
  const auth=callbackAuth(request);
  if(!auth.configured) return respond({rates:[]},503);
  if(!auth.authorized) return respond({rates:[]},403);

  let body;
  try { body=await readLimitedJson(request,MAX_RATE_BODY_BYTES); }
  catch { return respond({rates:[]},400); }

  const result=await getDelhiveryCheckoutRates(body);
  if(!result.configured || result.error) return respond({rates:[]},503);
  return respond({rates:result.rates});
}
