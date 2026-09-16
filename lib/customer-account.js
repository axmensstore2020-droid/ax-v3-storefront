import 'server-only';
import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';

export const CUSTOMER_ACCOUNT_SESSION_COOKIE='ax_customer_account_session';
export const CUSTOMER_ACCOUNT_OAUTH_COOKIE='ax_customer_account_oauth';
export const CUSTOMER_ACCOUNT_CALLBACK_PATH='/account/authorize';
export const CUSTOMER_ACCOUNT_LOGOUT_PATH='/account/logout';
export const CUSTOMER_ACCOUNT_SESSION_MAX_AGE=30*24*60*60;
export const CUSTOMER_ACCOUNT_OAUTH_MAX_AGE=10*60;

const DEFAULT_SCOPE='openid email customer-account-api:full';
const endpointKeys=['authorizationEndpoint','tokenEndpoint','logoutEndpoint','apiEndpoint'];

function httpsUrl(value,{originOnly=false}={}) {
  if(typeof value!=='string' || !value.trim()) return null;
  try {
    const url=new URL(value.trim());
    if(url.protocol!=='https:' || url.username || url.password || url.hash || (originOnly && (url.pathname!=='/' || url.search))) return null;
    return originOnly ? url.origin : url.href;
  } catch { return null; }
}

function endpoint(value) { return httpsUrl(value); }

function cookieValue(request,name) {
  const raw=request?.headers?.get('cookie') || '';
  const pair=raw.split(';').map(item=>item.trim()).find(item=>item.startsWith(`${name}=`));
  if(!pair) return '';
  const value=pair.slice(name.length+1);
  try { return decodeURIComponent(value); } catch { return value; }
}

function keyFor(secret) { return createHash('sha256').update(String(secret)).digest(); }

export function sealAccount(value,secret) {
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',keyFor(secret),iv);
  const encrypted=Buffer.concat([cipher.update(Buffer.from(JSON.stringify(value))),cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function unsealAccount(token,secret) {
  if(typeof token!=='string' || token.length<20 || token.length>12000) return null;
  const [version,ivText,tagText,dataText,...extra]=token.split('.');
  if(version!=='v1' || extra.length || !ivText || !tagText || !dataText) return null;
  try {
    const iv=Buffer.from(ivText,'base64url'),tag=Buffer.from(tagText,'base64url'),data=Buffer.from(dataText,'base64url');
    if(iv.length!==12 || tag.length!==16 || !data.length) return null;
    const decipher=createDecipheriv('aes-256-gcm',keyFor(secret),iv);decipher.setAuthTag(tag);
    const value=JSON.parse(Buffer.concat([decipher.update(data),decipher.final()]).toString());
    return value && Number(value.exp)>Date.now() ? value : null;
  } catch { return null; }
}

export function customerAccountConfig(env=process.env) {
  const domain=String(env.SHOPIFY_STORE_DOMAIN || '').trim().toLowerCase();
  const clientId=String(env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID || '').trim();
  const clientSecret=String(env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET || '').trim();
  const sessionSecret=String(env.SHOPIFY_CUSTOMER_ACCOUNT_SESSION_SECRET || '').trim();
  const siteOrigin=httpsUrl(env.AX_SITE_ORIGIN,{originOnly:true});
  const validDomain=/^[a-z0-9-]+\.myshopify\.com$/.test(domain);
  return {
    domain,clientId,clientSecret,sessionSecret,siteOrigin,
    scope:String(env.SHOPIFY_CUSTOMER_ACCOUNT_SCOPE || DEFAULT_SCOPE).trim() || DEFAULT_SCOPE,
    authorizationEndpoint:endpoint(env.SHOPIFY_CUSTOMER_ACCOUNT_AUTHORIZATION_URL),
    tokenEndpoint:endpoint(env.SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_URL),
    logoutEndpoint:endpoint(env.SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URL),
    apiEndpoint:endpoint(env.SHOPIFY_CUSTOMER_ACCOUNT_API_URL),
    enabled:Boolean(validDomain && clientId && clientSecret && sessionSecret.length>=32 && siteOrigin)
  };
}

export const customerAccountConfigured=env=>customerAccountConfig(env).enabled;

export function cookieOptions(maxAge) {
  return {httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge};
}

export function clearCookieOptions() { return cookieOptions(0); }

export function readOAuthState(request,config) {
  const value=unsealAccount(cookieValue(request,CUSTOMER_ACCOUNT_OAUTH_COOKIE),config.sessionSecret);
  return value?.kind==='oauth' && typeof value.state==='string' && typeof value.verifier==='string' && Number(value.exp)>Date.now() ? value : null;
}

function accountSessionValue(token,config) {
  const value=unsealAccount(token,config.sessionSecret);
  if(value?.kind!=='session' || typeof value.accessToken!=='string' || !value.accessToken) return null;
  return {accessToken:value.accessToken,refreshToken:typeof value.refreshToken==='string'?value.refreshToken:'',idToken:typeof value.idToken==='string'?value.idToken:'',expiresAt:Number(value.expiresAt)||0,exp:Number(value.exp)||0};
}

export function readAccountSession(request,config) { return accountSessionValue(cookieValue(request,CUSTOMER_ACCOUNT_SESSION_COOKIE),config); }
export function readAccountSessionToken(token,config) { return accountSessionValue(token,config); }

export function sessionExpired(session,graceMs=60_000) { return !session || !Number.isFinite(session.expiresAt) || session.expiresAt<=Date.now()+graceMs; }

export function safeReturnTo(value,fallback='/account') {
  const raw=typeof value==='string' ? value.trim() : '';
  if(!raw || raw.startsWith('//') || !raw.startsWith('/') || /[\u0000-\u001f]/.test(raw)) return fallback;
  try {
    const url=new URL(raw,'https://ax.invalid');
    return url.origin==='https://ax.invalid' ? url.pathname+url.search+url.hash : fallback;
  } catch { return fallback; }
}

export function callbackUrl(config) { return `${config.siteOrigin}${CUSTOMER_ACCOUNT_CALLBACK_PATH}`; }
export function logoutRedirectUrl(config) { return `${config.siteOrigin}${CUSTOMER_ACCOUNT_LOGOUT_PATH}`; }

function validEndpointSet(data) {
  return endpointKeys.reduce((result,key)=>{if(data[key]) result[key]=httpsUrl(data[key]);return result;},{});
}

export async function discoverCustomerAccount(config,fetchImpl=fetch) {
  const overrides=validEndpointSet(config);
  if(overrides.authorizationEndpoint && overrides.tokenEndpoint && overrides.logoutEndpoint && overrides.apiEndpoint) return overrides;
  const response=await fetchImpl(`https://${config.domain}/.well-known/openid-configuration`,{method:'GET',headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw new Error('Customer account service unavailable.');
  let data;try { data=await response.json(); } catch { throw new Error('Customer account service unavailable.'); }
  const endpoints={
    authorizationEndpoint:overrides.authorizationEndpoint || data.authorization_endpoint,
    tokenEndpoint:overrides.tokenEndpoint || data.token_endpoint,
    logoutEndpoint:overrides.logoutEndpoint || data.end_session_endpoint || data.logout_endpoint,
    apiEndpoint:overrides.apiEndpoint || data.graphql_api || data.graphql_api_endpoint
  };
  if(!endpoint(endpoints.authorizationEndpoint) || !endpoint(endpoints.tokenEndpoint) || !endpoint(endpoints.logoutEndpoint)) throw new Error('Customer account service is not configured.');
  if(!endpoint(endpoints.apiEndpoint)) endpoints.apiEndpoint='';
  return validEndpointSet(endpoints);
}

export function authorizationUrl(config,endpoints,{state,codeChallenge}) {
  const url=new URL(endpoints.authorizationEndpoint);
  url.searchParams.set('client_id',config.clientId);
  url.searchParams.set('response_type','code');
  url.searchParams.set('redirect_uri',callbackUrl(config));
  url.searchParams.set('scope',config.scope);
  url.searchParams.set('state',state);
  url.searchParams.set('code_challenge',codeChallenge);
  url.searchParams.set('code_challenge_method','S256');
  return url.toString();
}

export function pkce() {
  const verifier=randomBytes(32).toString('base64url');
  const codeChallenge=createHash('sha256').update(verifier).digest('base64url');
  return {verifier,codeChallenge};
}

function basicAuth(config) { return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`; }

function tokenSession(token,config) {
  if(!token || typeof token.access_token!=='string' || !token.access_token) throw new Error('Customer account sign-in could not be completed.');
  const seconds=Number(token.expires_in);
  const expiresAt=Date.now()+(Number.isFinite(seconds)&&seconds>0?seconds*1000:5*60*1000);
  return {kind:'session',accessToken:token.access_token,refreshToken:typeof token.refresh_token==='string'?token.refresh_token:'',idToken:typeof token.id_token==='string'?token.id_token:'',expiresAt,exp:Date.now()+CUSTOMER_ACCOUNT_SESSION_MAX_AGE*1000};
}

async function tokenRequest(config,endpoints,body,fetchImpl) {
  const response=await fetchImpl(endpoints.tokenEndpoint,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded',Authorization:basicAuth(config)},body:new URLSearchParams(body),cache:'no-store',signal:AbortSignal.timeout(10000)});
  let data;try { data=await response.json(); } catch { data=null; }
  if(!response.ok || !data?.access_token) throw new Error('Customer account sign-in could not be completed.');
  return tokenSession(data,config);
}

export function exchangeCode(config,endpoints,{code,verifier},fetchImpl=fetch) {
  return tokenRequest(config,endpoints,{grant_type:'authorization_code',code,redirect_uri:callbackUrl(config),code_verifier:verifier},fetchImpl);
}

export function refreshAccountSession(config,endpoints,session,fetchImpl=fetch) {
  if(!session?.refreshToken) throw new Error('Customer account session expired.');
  return tokenRequest(config,endpoints,{grant_type:'refresh_token',refresh_token:session.refreshToken},fetchImpl).then(next=>({
    ...next,
    refreshToken:next.refreshToken || session.refreshToken,
    idToken:next.idToken || session.idToken
  }));
}

export async function queryCustomerAccount(config,session,query,variables={},fetchImpl=fetch) {
  const endpoints=await discoverCustomerAccount(config,fetchImpl);
  if(!endpoints.apiEndpoint) throw new Error('Customer account API endpoint is not configured.');
  let current=session;
  for(let attempt=0;attempt<2;attempt++) {
    const response=await fetchImpl(endpoints.apiEndpoint,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${current.accessToken}`},body:JSON.stringify({query,variables}),cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(response.status===401 && attempt===0 && current.refreshToken) { current=await refreshAccountSession(config,endpoints,current,fetchImpl);continue; }
    let data;try { data=await response.json(); } catch { data=null; }
    if(!response.ok || data?.errors?.length || !data?.data) throw new Error('Customer account data is temporarily unavailable.');
    return {data:data.data,session:current};
  }
  throw new Error('Customer account data is temporarily unavailable.');
}

export function providerLogoutUrl(config,endpoints,session) {
  if(!endpoints.logoutEndpoint) return '';
  const url=new URL(endpoints.logoutEndpoint);
  if(session?.idToken) url.searchParams.set('id_token_hint',session.idToken);
  url.searchParams.set('post_logout_redirect_uri',logoutRedirectUrl(config));
  return url.toString();
}
