import {NextResponse} from 'next/server';
import {customerAccountConfig,queryCustomerAccount,readAccountSession,sessionExpired} from '../../../../lib/customer-account.js';

const mutation=`mutation AXCustomerUpdate($input: CustomerUpdateInput!) {
  customerUpdate(input: $input) {
    customer { firstName lastName displayName }
    userErrors { field message }
  }
}`;

function redirect(request,status,hash='profile') {
  const url=new URL('/account',request.url);
  url.searchParams.set('status',status);
  url.hash=hash;
  return NextResponse.redirect(url,303);
}
function safeText(value,max=80) { return String(value || '').trim().slice(0,max); }
function sameOrigin(request,origin) {
  const source=request.headers.get('origin');
  return !source || source===origin;
}

export async function POST(request) {
  const config=customerAccountConfig();
  if(!config.enabled) return redirect(request,'unavailable');
  if(!sameOrigin(request,config.siteOrigin)) return new NextResponse('Forbidden',{status:403});
  const session=readAccountSession(request,config);
  if(!session) return redirect(request,'signin');
  if(sessionExpired(session)) {
    const url=new URL('/account/refresh',request.url);
    url.searchParams.set('returnTo','/account#profile');
    return NextResponse.redirect(url,303);
  }
  const form=await request.formData();
  const input={firstName:safeText(form.get('firstName')),lastName:safeText(form.get('lastName'))};
  try {
    const result=await queryCustomerAccount(config,session,mutation,{input});
    const payload=result.data?.customerUpdate;
    if(!payload || payload.userErrors?.length) return redirect(request,'profile-error');
    return redirect(request,'profile-saved');
  } catch {
    return redirect(request,'profile-error');
  }
}
