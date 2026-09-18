import {createHash,timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {getDelhiveryCheckoutRates} from '../../../../lib/delhivery.js';
import {readLimitedJson} from '../../../../lib/request-security.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const MAX_RATE_BODY_BYTES=65536;
// Secondary callback-key verifier used only for Shopify CarrierService registration.
// The raw callback key is never committed; only its SHA-256 digest is stored here.
const SHOPIFY_CARRIER_CALLBACK_KEY_SHA256='983925e5e00f413e384937e1d2462efa746ed2dd3d2710a8d433091803269c92';

function respond(data,status=200) {
  return NextResponse.json(data,{status,headers:{
    'Cache-Control':'no-store, private',
    'X-Content-Type-Options':'nosniff',
    'Cross-Origin-Resource-Policy':'same-origin'
  }});
}

function callbackAuth(request) {
  const expected=String(process.env.AX_SHIPPING_CALLBACK_SECRET || '').trim();
  const supplied=new URL(request.url).searchParams.get('key') || '';
  let authorized=false;
  if(expected.length>=24) {
    const left=Buffer.from(expected);
    const right=Buffer.from(supplied);
    authorized=left.length===right.length && timingSafeEqual(left,right);
  }
  if(!authorized && supplied) {
    const digest=createHash('sha256').update(supplied).digest('hex');
    const left=Buffer.from(SHOPIFY_CARRIER_CALLBACK_KEY_SHA256);
    const right=Buffer.from(digest);
    authorized=left.length===right.length && timingSafeEqual(left,right);
  }
  return {configured:expected.length>=24 || Boolean(SHOPIFY_CARRIER_CALLBACK_KEY_SHA256),authorized};
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
