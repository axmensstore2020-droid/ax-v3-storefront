import {timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {createDatabase} from '../../../../lib/stylist/database.js';
import {getProduct} from '../../../../lib/shopify.js';
import {sendRestockEmail} from '../../../../lib/restock-email.js';
import {processRestockSubscriptions} from '../../../../lib/restock-processor.js';
import {restockProcessorConfigured} from '../../../../lib/restock-config.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function authorized(request,secret){
  const supplied=String(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!supplied || supplied.length!==secret.length)return false;
  return timingSafeEqual(Buffer.from(supplied),Buffer.from(secret));
}

export async function POST(request){
  const secret=String(process.env.AX_RESTOCK_PROCESSOR_SECRET||'');
  if(!restockProcessorConfigured()) return NextResponse.json({ok:false,error:'Restock processor is not configured.'},{status:503,headers:{'Cache-Control':'no-store'}});
  if(!authorized(request,secret)) return NextResponse.json({ok:false,error:'Unauthorized.'},{status:401,headers:{'Cache-Control':'no-store'}});
  try{
    const summary=await processRestockSubscriptions({
      database:createDatabase(),
      getProduct,
      sendEmail:sendRestockEmail,
      env:process.env,
      limit:25
    });
    return NextResponse.json({ok:true,...summary},{headers:{'Cache-Control':'no-store'}});
  }catch{
    return NextResponse.json({ok:false,error:'Restock processing failed.'},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
