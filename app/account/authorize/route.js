import {NextResponse} from 'next/server';
import {authCompleteUrl,clearCookieOptions,cookieOptions,customerAccountConfig,CUSTOMER_ACCOUNT_OAUTH_COOKIE,CUSTOMER_ACCOUNT_SESSION_COOKIE,CUSTOMER_ACCOUNT_SESSION_MAX_AGE,discoverCustomerAccount,exchangeCode,readOAuthState,sealAccount} from '../../../lib/customer-account.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const failure=(request,config,status)=>NextResponse.redirect(`${config.siteOrigin || new URL(request.url).origin}/account?status=${status}`);

export async function GET(request) {
  const config=customerAccountConfig();
  if(!config.enabled) return failure(request,config,'unavailable');
  const url=new URL(request.url),params=url.searchParams;
  const oauth=readOAuthState(request,config),state=params.get('state'),code=params.get('code');
  if(params.get('error') || params.get('error_description')) {
    const response=failure(request,config,'cancelled');response.cookies.set(CUSTOMER_ACCOUNT_OAUTH_COOKIE,'',clearCookieOptions());return response;
  }
  if(!oauth || !state || state!==oauth.state || !code || code.length>4096) {
    const response=failure(request,config,'invalid');response.cookies.set(CUSTOMER_ACCOUNT_OAUTH_COOKIE,'',clearCookieOptions());return response;
  }
  try {
    const endpoints=await discoverCustomerAccount(config),session=await exchangeCode(config,endpoints,{code,verifier:oauth.verifier},fetch);
    const response=NextResponse.redirect(authCompleteUrl(config,oauth.returnTo));
    response.cookies.set(CUSTOMER_ACCOUNT_SESSION_COOKIE,sealAccount({...session,exp:Date.now()+CUSTOMER_ACCOUNT_SESSION_MAX_AGE*1000},config.sessionSecret),cookieOptions(CUSTOMER_ACCOUNT_SESSION_MAX_AGE));
    response.cookies.set(CUSTOMER_ACCOUNT_OAUTH_COOKIE,'',clearCookieOptions());
    return response;
  } catch (error) {
    // Keep shopper messaging generic, but retain a safe diagnostic in Hostinger's
    // server logs. OAuth codes, tokens and client secrets are never logged.
    console.error('[AX customer account] OAuth token exchange failed.',{status:Number.isInteger(error?.status)?error.status:undefined,code:typeof error?.code==='string'?error.code:'unknown'});
    const response=failure(request,config,'error');response.cookies.set(CUSTOMER_ACCOUNT_OAUTH_COOKIE,'',clearCookieOptions());return response;
  }
}
