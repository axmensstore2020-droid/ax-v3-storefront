import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStylistQuotaAlert,sendStylistQuotaAlert,stylistAlertConfigured} from '../lib/stylist/alerts.js';
import {FASHION_KNOWLEDGE} from '../lib/stylist/fashion-knowledge.js';
import {INSTRUCTIONS} from '../lib/stylist/prompts.js';

const env={
  RESEND_API_KEY:'re_test_key',
  AX_STYLIST_ALERT_EMAIL:'owner@axstore.in',
  AX_STYLIST_ALERT_FROM_EMAIL:"AX Men's Store <alerts@axstore.in>"
};

test('stylist quota alert email contains aggregate usage only',()=>{
  assert.equal(stylistAlertConfigured(env),true);
  const alert=buildStylistQuotaAlert({level:'warning',used:360,limit:450,warningPercent:80,date:'2026-09-24'});
  assert.match(alert.subject,/360\/450/);
  assert.match(alert.text,/80%/);
  assert.doesNotMatch(alert.text,/customer|prompt|photo/i);
});

test('stylist quota alert uses deterministic Resend idempotency key',async()=>{
  let request;
  const result=await sendStylistQuotaAlert({level:'limit',used:450,limit:450,date:'2026-09-24'},env,async(url,options)=>{
    request={url,options};
    return Response.json({id:'email_quota_123'});
  });
  assert.equal(result.id,'email_quota_123');
  assert.equal(request.url,'https://api.resend.com/emails');
  assert.equal(request.options.headers['Idempotency-Key'],'ax-stylist-limit-2026-09-24');
  const body=JSON.parse(request.options.body);
  assert.deepEqual(body.to,['owner@axstore.in']);
  assert.ok(!/session|conversation|profile|image/.test(JSON.stringify(body)));
});

test('AX fashion knowledge covers Indian, streetwear, formal and wedding styling with cultural guardrails',()=>{
  for(const term of ['mundu','veshti','dhoti','sherwani','bandhgala','streetwear','FORMAL','WEDDING WEAR','South Indian']) {
    assert.match(FASHION_KNOWLEDGE,new RegExp(term,'i'));
  }
  assert.match(FASHION_KNOWLEDGE,/never assume religion, caste, ethnicity/i);
  assert.match(FASHION_KNOWLEDGE,/do not say something is "trending now"/i);
  assert.ok(INSTRUCTIONS.includes(FASHION_KNOWLEDGE));
});
