import {NextResponse} from 'next/server';
import {customerAccountConfig,queryCustomerAccount,readAccountSession,sessionExpired} from '../../../../lib/customer-account.js';
import {createDatabase,databaseConfigured} from '../../../../lib/stylist/database.js';
import {normalizeWhatsappPhone} from '../../../../lib/whatsapp.js';

const customerIdQuery=`query AXWhatsappCustomer { customer { id } }`;

function redirect(request,status){
  const url=new URL('/account',request.url);
  url.searchParams.set('status',status);
  url.hash='whatsapp';
  return NextResponse.redirect(url,303);
}
function sameOrigin(request,origin){
  const source=request.headers.get('origin');
  return !source || source===origin;
}

export async function POST(request){
  const config=customerAccountConfig();
  const enabled=process.env.AX_WHATSAPP_RETENTION_ENABLED==='true' && databaseConfigured() && String(process.env.AX_STYLIST_SECRET || '').length>=32;
  if(!config.enabled || !enabled) return redirect(request,'unavailable');
  if(!sameOrigin(request,config.siteOrigin)) return new NextResponse('Forbidden',{status:403});
  const session=readAccountSession(request,config);
  if(!session) return redirect(request,'signin');
  if(sessionExpired(session)){
    const url=new URL('/account/refresh',request.url);
    url.searchParams.set('returnTo','/account#whatsapp');
    return NextResponse.redirect(url,303);
  }
  try{
    const form=await request.formData(),intent=String(form.get('intent') || '');
    const result=await queryCustomerAccount(config,session,customerIdQuery);
    const customerId=result.data?.customer?.id;
    if(!customerId) return redirect(request,'whatsapp-error');
    const database=createDatabase();
    if(intent==='unsubscribe'){
      await database.saveWhatsappPreference(customerId,{optedIn:false,source:'account'});
      return redirect(request,'whatsapp-removed');
    }
    if(intent!=='subscribe' || form.get('consent')!=='on') return redirect(request,'whatsapp-error');
    const phoneE164=normalizeWhatsappPhone(form.get('phone'));
    if(!phoneE164) return redirect(request,'whatsapp-error');
    await database.saveWhatsappPreference(customerId,{phoneE164,optedIn:true,source:'account'});
    return redirect(request,'whatsapp-saved');
  }catch{
    return redirect(request,'whatsapp-error');
  }
}
