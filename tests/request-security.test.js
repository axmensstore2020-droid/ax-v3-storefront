import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {reserveAccountBurst,reserveCartBurst,reserveCatalogBurst,reservePlayroomBurst,sameOriginRequest,CART_GUARD_COOKIE,CATALOG_GUARD_COOKIE,PLAYROOM_GUARD_COOKIE} from '../lib/request-security.js';
import {assertAllowedFormKeys,assertAllowedKeys,readLimitedForm,readLimitedJson} from '../lib/request-body.js';
import {createStorePreviewToken,storePreviewKeyValid,storePreviewTokenValid} from '../lib/store-preview.js';

test('same-origin guard accepts AX and rejects cross-site requests',()=>{
 const good=new Request('https://axstore.in/api/cart',{method:'POST',headers:{origin:'https://axstore.in','sec-fetch-site':'same-origin'}});
 const bad=new Request('https://axstore.in/api/cart',{method:'POST',headers:{origin:'https://evil.example','sec-fetch-site':'cross-site'}});
 assert.equal(sameOriginRequest(good,'https://axstore.in'),true);
 assert.equal(sameOriginRequest(bad,'https://axstore.in'),false);
});

test('same-origin guard accepts public AX origin behind an internal reverse-proxy URL',()=>{
 const proxied=new Request('http://127.0.0.1:3000/api/playroom',{method:'POST',headers:{origin:'https://axstore.in','sec-fetch-site':'same-origin'}});
 assert.equal(sameOriginRequest(proxied,'https://axstore.in'),true);
});

test('limited JSON reader enforces type and byte limit',async()=>{
 const good=new Request('https://axstore.in/api/cart',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'create'})});
 assert.deepEqual(await readLimitedJson(good,100),{action:'create'});
 const wrongType=new Request('https://axstore.in/api/cart',{method:'POST',headers:{'content-type':'text/plain'},body:'{}'});
 await assert.rejects(()=>readLimitedJson(wrongType,100),/Send JSON/);
 const tooLarge=new Request('https://axstore.in/api/cart',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({value:'x'.repeat(100)})});
 await assert.rejects(()=>readLimitedJson(tooLarge,32),/too large/);
});

test('cart burst limiter blocks repeated requests in a window',()=>{
 const token=randomUUID();
 const request=new Request('https://axstore.in/api/cart',{headers:{cookie:`${CART_GUARD_COOKIE}=${token}`}});
 assert.equal(reserveCartBurst(request,{limit:10,windowMs:60_000,now:1000}).allowed,true);
 for(let i=0;i<9;i++) assert.equal(reserveCartBurst(request,{limit:10,windowMs:60_000,now:1001+i}).allowed,true);
 const blocked=reserveCartBurst(request,{limit:10,windowMs:60_000,now:2000});
 assert.equal(blocked.allowed,false);
 assert.ok(blocked.retryAfter>0);
});

test('server form parser enforces encoding, size and an explicit field allowlist',async()=>{
 const form=new URLSearchParams({firstName:'AX',lastName:'Store'});
 const request=new Request('https://axstore.in/account/actions/profile',{method:'POST',body:form});
 const parsed=await readLimitedForm(request,100);
 assert.equal(parsed.get('firstName'),'AX');
 assert.doesNotThrow(()=>assertAllowedFormKeys(parsed,['firstName','lastName']));
 parsed.set('role','admin');
 assert.throws(()=>assertAllowedFormKeys(parsed,['firstName','lastName']),/Unsupported/);
 const multipart=new Request('https://axstore.in/account/actions/profile',{method:'POST',headers:{'content-type':'multipart/form-data; boundary=x'},body:'--x--'});
 await assert.rejects(()=>readLimitedForm(multipart,100),/form data/);
});

test('JSON allowlists reject mass-assignment fields',()=>{
 assert.doesNotThrow(()=>assertAllowedKeys({message:'shirt',consent:true},['message','consent'],'Stylist'));
 assert.throws(()=>assertAllowedKeys({message:'shirt',consent:true,role:'admin'},['message','consent'],'Stylist'),/Unsupported Stylist field/);
});

test('catalog burst limiter blocks repeated public catalog reads',()=>{
 const token=randomUUID();
 const request=new Request('https://axstore.in/api/wishlist',{headers:{cookie:`${CATALOG_GUARD_COOKIE}=${token}`}});
 for(let i=0;i<10;i++) assert.equal(reserveCatalogBurst(request,{limit:10,windowMs:60_000,now:2000+i}).allowed,true);
 assert.equal(reserveCatalogBurst(request,{limit:10,windowMs:60_000,now:3000}).allowed,false);
});

test('account mutation limiter is bound to the signed-in session cookie',()=>{
 const request=new Request('https://axstore.in/account/actions/profile',{headers:{cookie:'ax_customer_account_session=opaque-session-token'}});
 for(let i=0;i<5;i++) assert.equal(reserveAccountBurst(request,{limit:5,windowMs:60_000,now:4000+i}).allowed,true);
 assert.equal(reserveAccountBurst(request,{limit:5,windowMs:60_000,now:5000}).allowed,false);
 assert.equal(reserveAccountBurst(new Request('https://axstore.in/account/actions/profile'),{limit:5,now:5000}).allowed,false);
});

test('Playroom reward endpoint has its own anonymous burst guard',()=>{
 const token=randomUUID();
 const request=new Request('https://axstore.in/api/playroom',{headers:{cookie:`${PLAYROOM_GUARD_COOKIE}=${token}`}});
 for(let i=0;i<10;i++) assert.equal(reservePlayroomBurst(request,{limit:10,windowMs:60_000,now:6000+i}).allowed,true);
 assert.equal(reservePlayroomBurst(request,{limit:10,windowMs:60_000,now:7000}).allowed,false);
});


test('private storefront preview requires the secret link and an untampered encrypted cookie',()=>{
 const testKey='preview-test-key-that-is-long-enough';
 const expectedHash=createHash('sha256').update(testKey).digest('hex');
 assert.equal(storePreviewKeyValid(testKey,expectedHash),true);
 assert.equal(storePreviewKeyValid('wrong-preview-key-that-is-long-enough',expectedHash),false);

 const env={AX_PLAYROOM_SECRET:'p'.repeat(48)};
 const now=Date.parse('2026-09-26T12:00:00Z');
 const token=createStorePreviewToken({env,now});
 assert.ok(token);
 assert.equal(storePreviewTokenValid(token,{env,now:now+1000}),true);
 assert.equal(storePreviewTokenValid(token+'x',{env,now:now+1000}),false);
 assert.equal(storePreviewTokenValid(token,{env,now:Date.parse('2026-10-01T10:30:00Z')}),false);
});
