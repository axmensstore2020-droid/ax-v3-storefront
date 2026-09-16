import {NextResponse} from 'next/server';
import {clearCookieOptions,customerAccountConfig,CUSTOMER_ACCOUNT_SESSION_COOKIE,discoverCustomerAccount,providerLogoutUrl,readAccountSession} from '../../../lib/customer-account.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function localLogout(request,config) {
  const response=NextResponse.redirect(new URL('/',config.siteOrigin || new URL(request.url).origin),303);
  response.cookies.set(CUSTOMER_ACCOUNT_SESSION_COOKIE,'',clearCookieOptions());
  return response;
}

export async function GET(request) { return localLogout(request,customerAccountConfig()); }

export async function POST(request) {
  const config=customerAccountConfig();
  if(!config.enabled) return localLogout(request,config);
  const session=readAccountSession(request,config);
  if(!session) return localLogout(request,config);
  try {
    const endpoints=await discoverCustomerAccount(config),target=providerLogoutUrl(config,endpoints,session);
    if(!target) return localLogout(request,config);
    const response=NextResponse.redirect(target,303);response.cookies.set(CUSTOMER_ACCOUNT_SESSION_COOKIE,'',clearCookieOptions());return response;
  } catch { return localLogout(request,config); }
}
