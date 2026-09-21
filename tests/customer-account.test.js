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
  discoverCustomerAccount,
  discoverCustomerAccountApi,
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
  assert.equal(tokenCall.init.headers.Origin,'https://ax.test');
  assert.equal(tokenCall.init.headers['User-Agent'],'AX-Mens-Store-Headless/1.0');
  const body=new URLSearchParams(tokenCall.init.body);
  assert.equal(body.get('grant_type'),'authorization_code');
  assert.equal(body.get('client_id'),'client-id');
  assert.equal(body.get('code_verifier'),verifier);
  assert.equal(body.get('redirect_uri'),callbackUrl(config));
});

test('Shopify account discovery is cached per fetch implementation',async()=>{
  const config=customerAccountConfig(baseEnv),calls=[];
  const fetcher=async url=>{
    calls.push(url);
    if(url.endsWith('/.well-known/openid-configuration')) return Response.json(discovery);
    return Response.json({graphql_api:discovery.graphql_api});
  };
  const first=await discoverCustomerAccount(config,fetcher);
  const second=await discoverCustomerAccount(config,fetcher);
  assert.equal(first.tokenEndpoint,discovery.token_endpoint);
  assert.equal(second.tokenEndpoint,discovery.token_endpoint);
  assert.equal(calls.filter(url=>url.endsWith('/.well-known/openid-configuration')).length,1);
  assert.equal(await discoverCustomerAccountApi(config,fetcher),discovery.graphql_api);
  assert.equal(await discoverCustomerAccountApi(config,fetcher),discovery.graphql_api);
  assert.equal(calls.filter(url=>url.endsWith('/.well-known/customer-account-api')).length,1);
});

test('Customer Account GraphQL endpoint uses Shopify API discovery',async()=>{
  const config=customerAccountConfig(baseEnv),calls=[];
  const apiEndpoint=await discoverCustomerAccountApi(config,async(url,init)=>{
    calls.push({url,init});
    return Response.json({graphql_api:discovery.graphql_api,mcp_api:'https://shopify.test/customer/mcp'});
  });
  assert.equal(calls[0].url,'https://axunisexstore.myshopify.com/.well-known/customer-account-api');
  assert.equal(calls[0].init.headers.Origin,'https://ax.test');
  assert.equal(calls[0].init.headers['User-Agent'],'AX-Mens-Store-Headless/1.0');
  assert.equal(apiEndpoint,discovery.graphql_api);
});

test('customer API refresh preserves a prior refresh token and sends the access token directly',async()=>{
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
  assert.equal(apiCalls[0].init.headers.Authorization,'expired-access');
  assert.equal(apiCalls[1].init.headers.Authorization,'new-access');
  assert.equal(apiCalls[0].init.headers.Origin,'https://ax.test');
  assert.equal(apiCalls[0].init.headers['User-Agent'],'AX-Mens-Store-Headless/1.0');
  const refreshCall=calls.find(item=>item.url===discovery.token_endpoint);
  assert.equal(refreshCall.init.headers.Origin,'https://ax.test');
  assert.equal(refreshCall.init.headers['User-Agent'],'AX-Mens-Store-Headless/1.0');
  const refreshBody=new URLSearchParams(refreshCall.init.body);
  assert.equal(refreshBody.get('refresh_token'),'old-refresh');
  assert.equal(refreshBody.get('client_id'),'client-id');
});

test('provider logout keeps the post-logout target on AX',()=>{
  const config=customerAccountConfig(baseEnv);
  const endpoints={logoutEndpoint:discovery.end_session_endpoint};
  const url=new URL(providerLogoutUrl(config,endpoints,{idToken:'id-token'}));
  assert.equal(url.searchParams.get('id_token_hint'),'id-token');
  assert.equal(url.searchParams.get('post_logout_redirect_uri'),logoutRedirectUrl(config));
});
