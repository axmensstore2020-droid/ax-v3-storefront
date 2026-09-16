import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readLimitedJson,reserveCartBurst,sameOriginRequest,CART_GUARD_COOKIE} from '../lib/request-security.js';

test('same-origin guard accepts AX and rejects cross-site requests',()=>{
 const good=new Request('https://axstore.in/api/cart',{method:'POST',headers:{origin:'https://axstore.in','sec-fetch-site':'same-origin'}});
 const bad=new Request('https://axstore.in/api/cart',{method:'POST',headers:{origin:'https://evil.example','sec-fetch-site':'cross-site'}});
 assert.equal(sameOriginRequest(good,'https://axstore.in'),true);
 assert.equal(sameOriginRequest(bad,'https://axstore.in'),false);
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
