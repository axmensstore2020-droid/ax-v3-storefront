import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSentryDsn,reportServerError} from '../lib/error-monitoring.js';

test('Sentry DSN parsing rejects unsafe or malformed values',()=>{
  assert.equal(parseSentryDsn(''),null);
  assert.equal(parseSentryDsn('http://key@example.com/123'),null);
  assert.equal(parseSentryDsn('https://example.com/not-a-project'),null);
  assert.deepEqual(parseSentryDsn('https://public@example.com/123'),{
    dsn:'https://public@example.com/123',origin:'https://example.com',publicKey:'public',projectId:'123'
  });
});

test('server error reporting sends a bounded Sentry envelope without request bodies',async()=>{
  let call;
  const ok=await reportServerError(new Error('boom'),{source:'test',path:'https://ax.test/products/x?email=hidden@example.com'},{
    SENTRY_DSN:'https://public@example.com/123',
    AX_ERROR_ENVIRONMENT:'test',
    AX_ERROR_RELEASE:'abc123'
  },async(url,init)=>{call={url,init};return new Response('',{status:200});});
  assert.equal(ok,true);
  assert.match(call.url,/\/api\/123\/envelope/);
  assert.match(call.init.body,/"environment":"test"/);
  assert.match(call.init.body,/"url":"\/products\/x"/);
  assert.doesNotMatch(call.init.body,/hidden@example.com/);
});
