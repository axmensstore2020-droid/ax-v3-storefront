import {NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {authorizationUrl,cookieOptions,customerAccountConfig,CUSTOMER_ACCOUNT_OAUTH_COOKIE,CUSTOMER_ACCOUNT_OAUTH_MAX_AGE,discoverCustomerAccount,pkce,safeReturnTo,sealAccount} from '../../../lib/customer-account.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const accountRedirect=(config,status='unavailable')=>NextResponse.redirect(`${config.siteOrigin}/account?status=${status}`);

export async function GET(request) {
  const config=customerAccountConfig();
  if(!config.enabled) return accountRedirect({...config,siteOrigin:config.siteOrigin || new URL(request.url).origin});
  const returnTo=safeReturnTo(new URL(request.url).searchParams.get('returnTo'));
  try {
    const endpoints=await discoverCustomerAccount(config),{verifier,codeChallenge}=pkce(),state=randomBytes(24).toString('base64url');
    const response=NextResponse.redirect(authorizationUrl(config,endpoints,{state,codeChallenge}));
    response.cookies.set(CUSTOMER_ACCOUNT_OAUTH_COOKIE,sealAccount({kind:'oauth',state,verifier,returnTo,exp:Date.now()+CUSTOMER_ACCOUNT_OAUTH_MAX_AGE*1000},config.sessionSecret),cookieOptions(CUSTOMER_ACCOUNT_OAUTH_MAX_AGE));
    return response;
  } catch (error) {
    console.error('[AX customer account] OAuth sign-in could not start.',{status:Number.isInteger(error?.status)?error.status:undefined,code:typeof error?.code==='string'?error.code:'discovery_failed'});
    return accountRedirect(config,'unavailable');
  }
}
