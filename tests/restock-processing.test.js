import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRestockEmail,restockEmailConfigured,sendRestockEmail} from '../lib/restock-email.js';
import {processRestockSubscriptions} from '../lib/restock-processor.js';

const env={
  RESEND_API_KEY:'re_test_key',
  AX_RESTOCK_FROM_EMAIL:'AX Men\'s Store <restock@axstore.in>',
  AX_PUBLIC_SITE_URL:'https://axstore.in'
};

test('restock email is transactional and links to the exact Shopify variant',()=>{
  assert.equal(restockEmailConfigured(env),true);
  const mail=buildRestockEmail({
    subscription:{id:'a'.repeat(64),email:'customer@example.com',variant_label:'Colour: Black · Size: M'},
    product:{handle:'racing-jacket',title:'Racing <Jacket>'},
    variant:{id:'gid://shopify/ProductVariant/123'}
  },env);
  assert.match(mail.url,/\/products\/racing-jacket\?variant=123$/);
  assert.match(mail.html,/Racing &lt;Jacket&gt;/);
  assert.match(mail.text,/does not subscribe you to marketing/);
});

test('resend delivery uses an idempotency key and requires provider success',async()=>{
  let request;
  const sent=await sendRestockEmail({
    subscription:{id:'b'.repeat(64),email:'customer@example.com',variant_label:'Size: L'},
    product:{handle:'tee',title:'AX Tee'},
    variant:{id:'gid://shopify/ProductVariant/456'}
  },env,async(url,options)=>{
    request={url,options};
    return Response.json({id:'email_123'});
  });
  assert.equal(sent.id,'email_123');
  assert.equal(request.url,'https://api.resend.com/emails');
  assert.equal(request.options.headers['Idempotency-Key'],'ax-restock-'+'b'.repeat(64));
});

test('processor sends only when exact variant is back in stock',async()=>{
  const rows=[
    {id:'1'.repeat(64),email:'a@example.com',product_handle:'jacket',variant_id:'gid://shopify/ProductVariant/1',variant_label:'Size: M',attempt_count:0},
    {id:'2'.repeat(64),email:'b@example.com',product_handle:'jacket',variant_id:'gid://shopify/ProductVariant/2',variant_label:'Size: L',attempt_count:0}
  ];
  const notified=[],attempts=[];
  const database={
    listPendingRestockSubscriptions:async()=>rows,
    markRestockNotified:async(id,message)=>notified.push([id,message]),
    markRestockAttempt:async(...args)=>attempts.push(args),
    closeRestockSubscription:async()=>{}
  };
  const product={handle:'jacket',title:'Jacket',variants:[
    {id:rows[0].variant_id,availableForSale:true},
    {id:rows[1].variant_id,availableForSale:false}
  ]};
  const result=await processRestockSubscriptions({
    database,
    getProduct:async()=>product,
    sendEmail:async()=>({id:'email_one'}),
    env,
    now:new Date('2026-09-19T00:00:00Z')
  });
  assert.deepEqual(result,{checked:2,waiting:1,notified:1,cancelled:0,failed:0});
  assert.deepEqual(notified,[[rows[0].id,'email_one']]);
  assert.deepEqual(attempts,[]);
});
