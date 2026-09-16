import {NextResponse} from 'next/server';
import {clearCookieOptions,cookieOptions,customerAccountConfig,CUSTOMER_ACCOUNT_SESSION_COOKIE,CUSTOMER_ACCOUNT_SESSION_MAX_AGE,discoverCustomerAccount,readAccountSession,refreshAccountSession,safeReturnTo,sealAccount,sessionExpired} from '../../../lib/customer-account.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request) {
  const config=customerAccountConfig(),returnTo=safeReturnTo(new URL(request.url).searchParams.get('returnTo'));
  if(!config.enabled) return NextResponse.redirect(`${config.siteOrigin || new URL(request.url).origin}/account?status=unavailable`);
  const current=readAccountSession(request,config);
  if(!current) return NextResponse.redirect(`${config.siteOrigin}/account?status=signin`);
  if(!sessionExpired(current)) return NextResponse.redirect(new URL(returnTo,config.siteOrigin));
  try {
    const endpoints=await discoverCustomerAccount(config),session=await refreshAccountSession(config,endpoints,current,fetch),response=NextResponse.redirect(new URL(returnTo,config.siteOrigin));
    response.cookies.set(CUSTOMER_ACCOUNT_SESSION_COOKIE,sealAccount({...session,exp:Date.now()+CUSTOMER_ACCOUNT_SESSION_MAX_AGE*1000},config.sessionSecret),cookieOptions(CUSTOMER_ACCOUNT_SESSION_MAX_AGE));
    return response;
  } catch {
    const response=NextResponse.redirect(`${config.siteOrigin}/account?status=expired`);response.cookies.set(CUSTOMER_ACCOUNT_SESSION_COOKIE,'',clearCookieOptions());return response;
  }
}
