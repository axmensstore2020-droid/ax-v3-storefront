import test from 'node:test';
import assert from 'node:assert/strict';
import {createRestockVerification,normalizeRestockVerificationToken,restockVerificationHash} from '../lib/restock-verification.js';
import {buildRestockVerificationEmail,sendRestockVerificationEmail} from '../lib/restock-email.js';

const secret='restock-verification-secret-longer-than-thirty-two';
const env={RESEND_API_KEY:'re_test_key',AX_RESTOCK_FROM_EMAIL:'AX Men\'s Store <restock@axstore.in>',AX_PUBLIC_SITE_URL:'https://axstore.in'};

test('restock verification tokens are random, hashed at rest and expire separately from the subscription',()=>{
  const value=createRestockVerification(secret,1000);
  assert.match(value.token,/^[A-Za-z0-9_-]{40,100}$/);
  assert.match(value.hash,/^[a-f0-9]{64}$/);
  assert.equal(value.hash,restockVerificationHash(value.token,secret));
  assert.equal(normalizeRestockVerificationToken(value.token),value.token);
  assert.equal(normalizeRestockVerificationToken('../bad'),'');
});

test('verification email contains only the opaque confirmation token and is transactional',async()=>{
  const value=createRestockVerification(secret,1000);
  const payload={email:'customer@example.com',product:{title:'AX Tee'},variant:{selectedOptions:[{name:'Size',value:'M'}]},token:value.token,verificationHash:value.hash};
  const mail=buildRestockVerificationEmail(payload,env);
  assert.match(mail.verifyUrl,/\/api\/back-in-stock\/confirm\?token=/);
  assert.match(mail.text,/expires in 24 hours/i);
  let request;
  const sent=await sendRestockVerificationEmail(payload,env,async(url,options)=>{request={url,options};return Response.json({id:'verify_1'});});
  assert.equal(sent.id,'verify_1');
  assert.match(request.options.headers['Idempotency-Key'],/^ax-restock-verify-/);
  assert.doesNotMatch(request.options.body,/verificationHash/);
});
