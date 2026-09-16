import test from 'node:test';
import assert from 'node:assert/strict';

const secret='customer-account-test-secret-with-at-least-32-characters';
const baseEnv={
  SHOPIFY_STORE_DOMAIN:'axunisexstore.myshopify.com',
  SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID:'client-id',
  SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET:'client-secret',
  SHOPIFY_CUSTOMER_ACCOUNT_SESSION_SECRET:secret,
  AX_SITE_ORIGIN:'https://ax.test',
  SHOPIFY_CUSTOMER_ACCOUNT_SCOPE:'openid email customer-account-api:full'
};
const discovery={
  authorization_endpoint:'https://shopify.test/authorize',
  token_endpoint:'https://shopify.test/token',
  end_session_endpoint:'https://shopify.test/logout',
  graphql_api:'https://shopify.test/customer/graphql'
};

const {
  authorizationUrl,
  callbackUrl,
  customerAccountConfig,
  exchangeCode,
  logoutRedirectUrl,
  pkce,
  providerLogoutUrl,
  queryCustomerAccount,
  safeReturnTo,
  sealAccount,
  unsealAccount
}=await import('../lib/customer-account.js');

test('customer account config requires a secure origin and a server session secret',()=>{
  assert.equal(customerAccountConfig(baseEnv).enabled,true);
  assert.equal(customerAccountConfig({...baseEnv,AX_SITE_ORIGIN:'https://ax.test/account'}).enabled,false);
  assert.equal(customerAccountConfig({...baseEnv,SHOPIFY_CUSTOMER_ACCOUNT_SESSION_SECRET:'short'}).enabled,false);
  assert.equal(customerAccountConfig({...baseEnv,SHOPIFY_STORE_DOMAIN:'shop.example'}).enabled,false);
});

test('customer account cookies are encrypted, tamper-resistant and expiring',()=>{
  const token=sealAccount({kind:'session',accessToken:'private-access-token',exp:Date.now()+60_000},secret);
  const parts=token.split('.');parts[2]=parts[2].startsWith('a') ? `b${parts[2].slice(1)}` : `a${parts[2].slice(1)}`;
  assert.equal(unsealAccount(token,secret).accessToken,'private-access-token');
  assert.equal(unsealAccount(parts.join('.'),secret),null);
  assert.equal(unsealAccount(token,'different-secret-with-at-least-32-characters'),null);
  assert.equal(unsealAccount(sealAccount({kind:'session',exp:1},secret),secret),null);
});

test('safe return paths never leave the AX origin',()=>{
  assert.equal(safeReturnTo('/products?search=1'),'/products?search=1');
  assert.equal(safeReturnTo('https://evil.example/account'),'/account');
  assert.equal(safeReturnTo('//evil.example/account'),'/account');
  assert.equal(safeReturnTo('/account\u0000evil'),'/account');
});

test('OAuth uses PKCE, the registered callback and confidential token exchange',async()=>{
  const config=customerAccountConfig(baseEnv),endpoints={authorizationEndpoint:discovery.authorization_endpoint,tokenEndpoint:discovery.token_endpoint};
  const {verifier,codeChallenge}=pkce();
  const destination=new URL(authorizationUrl(config,endpoints,{state:'state-value',codeChallenge}));
  assert.equal(destination.origin,'https://shopify.test');
  assert.equal(destination.searchParams.get('client_id'),'client-id');
  assert.equal(destination.searchParams.get('redirect_uri'),callbackUrl(config));
  assert.equal(destination.searchParams.get('code_challenge_method'),'S256');
  assert.equal(destination.searchParams.get('state'),'state-value');
  let tokenCall;
  const session=await exchangeCode(config,endpoints,{code:'one-time-code',verifier},async(url,init)=>{
    tokenCall={url,init};
    return Response.json({access_token:'access-token',refresh_token:'refresh-token',id_token:'id-token',expires_in:3600});
  });
  assert.equal(session.accessToken,'access-token');
  assert.equal(session.refreshToken,'refresh-token');
  assert.equal(tokenCall.url,discovery.token_endpoint);
  assert.equal(tokenCall.init.headers.Authorization,`Basic ${Buffer.from('client-id:client-secret').toString('base64')}`);
  const body=new URLSearchParams(tokenCall.init.body);
  assert.equal(body.get('grant_type'),'authorization_code');
  assert.equal(body.get('code_verifier'),verifier);
  assert.equal(body.get('redirect_uri'),callbackUrl(config));
});

test('customer API refresh preserves a prior refresh token and uses bearer auth',async()=>{
  const config=customerAccountConfig({
    ...baseEnv,
    SHOPIFY_CUSTOMER_ACCOUNT_AUTHORIZATION_URL:discovery.authorization_endpoint,
    SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_URL:discovery.token_endpoint,
    SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URL:discovery.end_session_endpoint,
    SHOPIFY_CUSTOMER_ACCOUNT_API_URL:discovery.graphql_api
  });
  const calls=[];
  const result=await queryCustomerAccount(config,{accessToken:'expired-access',refreshToken:'old-refresh',idToken:'old-id',expiresAt:Date.now()+60_000,exp:Date.now()+60_000},'query CustomerAccount { customer { firstName } }',{},async(url,init={})=>{
    calls.push({url,init});
    if(url===discovery.graphql_api && calls.filter(item=>item.url===discovery.graphql_api).length===1) return new Response(null,{status:401});
    if(url===discovery.token_endpoint) return Response.json({access_token:'new-access',expires_in:3600});
    return Response.json({data:{customer:{firstName:'AX'}}});
  });
  assert.equal(result.data.customer.firstName,'AX');
  assert.equal(result.session.accessToken,'new-access');
  assert.equal(result.session.refreshToken,'old-refresh');
  const apiCalls=calls.filter(item=>item.url===discovery.graphql_api);
  assert.equal(apiCalls[1].init.headers.Authorization,'Bearer new-access');
  const refreshCall=calls.find(item=>item.url===discovery.token_endpoint);
  assert.equal(new URLSearchParams(refreshCall.init.body).get('refresh_token'),'old-refresh');
});

test('provider logout keeps the post-logout target on AX',()=>{
  const config=customerAccountConfig(baseEnv);
  const endpoints={logoutEndpoint:discovery.end_session_endpoint};
  const url=new URL(providerLogoutUrl(config,endpoints,{idToken:'id-token'}));
  assert.equal(url.searchParams.get('id_token_hint'),'id-token');
  assert.equal(url.searchParams.get('post_logout_redirect_uri'),logoutRedirectUrl(config));
});
