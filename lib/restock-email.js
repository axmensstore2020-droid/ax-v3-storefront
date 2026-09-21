import 'server-only';

function escapeHtml(value){
  return String(value||'').replace(/[&<>"']/g,character=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[character]);
}

function publicOrigin(env=process.env){
  try{
    const url=new URL(env.AX_PUBLIC_SITE_URL || '');
    return url.protocol==='https:' ? url.origin : '';
  }catch{return '';}
}

export function restockEmailConfigured(env=process.env){
  return String(env.RESEND_API_KEY||'').startsWith('re_')
    && /^[^\s<>]+@[^\s<>]+$/.test(String(env.AX_RESTOCK_FROM_EMAIL||'').match(/<([^>]+)>/)?.[1] || String(env.AX_RESTOCK_FROM_EMAIL||''))
    && Boolean(publicOrigin(env));
}

export function buildRestockEmail({subscription,product,variant},env=process.env){
  const origin=publicOrigin(env);
  if(!origin) throw new Error('Public storefront URL is not configured.');
  const variantNumber=String(variant?.id||'').match(/^gid:\/\/shopify\/ProductVariant\/(\d+)$/)?.[1] || '';
  const path='/products/'+encodeURIComponent(product.handle)+(variantNumber?'?variant='+variantNumber:'');
  const url=origin+path;
  const title=String(product.title||'Your saved AX piece').slice(0,160);
  const option=String(subscription.variant_label||'').slice(0,240);
  const subject=(title+' is back in stock — AX').slice(0,180);
  const html=`<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111;background:#fff;margin:0;padding:28px">
    <div style="max-width:560px;margin:0 auto">
      <p style="font-size:11px;letter-spacing:.14em;margin:0 0 22px">AX MEN'S STORE</p>
      <h1 style="font-size:30px;font-weight:500;line-height:1.15;margin:0 0 12px">It's back.</h1>
      <p style="font-size:16px;line-height:1.6;margin:0 0 8px"><strong>${escapeHtml(title)}</strong> is available again.</p>
      ${option?`<p style="font-size:14px;color:#666;margin:0 0 24px">${escapeHtml(option)}</p>`:''}
      <p style="margin:28px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 20px;font-size:12px;letter-spacing:.08em">SHOP THIS PIECE</a></p>
      <p style="font-size:12px;color:#777;line-height:1.6">Stock can move quickly. This is the one restock alert you requested for this option; it does not subscribe you to marketing.</p>
    </div>
  </body></html>`;
  const text=`AX MEN'S STORE\n\nIt's back.\n\n${title} is available again.${option?'\n'+option:''}\n\nShop: ${url}\n\nStock can move quickly. This is the one restock alert you requested for this option; it does not subscribe you to marketing.`;
  return {subject,html,text,url};
}

export function buildRestockVerificationEmail({product,variant,token},env=process.env){
  const origin=publicOrigin(env);
  if(!origin) throw new Error('Public storefront URL is not configured.');
  const verifyUrl=origin+'/api/back-in-stock/confirm?token='+encodeURIComponent(String(token||''));
  const title=String(product?.title||'this AX piece').slice(0,160);
  const option=(variant?.selectedOptions||[]).map(item=>String(item?.name||'')+': '+String(item?.value||'')).filter(Boolean).join(' · ').slice(0,240);
  const subject=('Confirm your restock alert — '+title).slice(0,180);
  const html=`<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111;background:#fff;margin:0;padding:28px">
    <div style="max-width:560px;margin:0 auto">
      <p style="font-size:11px;letter-spacing:.14em;margin:0 0 22px">AX MEN'S STORE</p>
      <h1 style="font-size:28px;font-weight:500;line-height:1.15;margin:0 0 12px">Confirm your alert.</h1>
      <p style="font-size:16px;line-height:1.6;margin:0 0 8px">Confirm that you want one back-in-stock email for <strong>${escapeHtml(title)}</strong>.</p>
      ${option?`<p style="font-size:14px;color:#666;margin:0 0 24px">${escapeHtml(option)}</p>`:''}
      <p style="margin:28px 0"><a href="${escapeHtml(verifyUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 20px;font-size:12px;letter-spacing:.08em">CONFIRM ALERT</a></p>
      <p style="font-size:12px;color:#777;line-height:1.6">This link expires in 24 hours. If you did not request this alert, ignore this email.</p>
    </div>
  </body></html>`;
  const text=`AX MEN'S STORE\n\nConfirm your restock alert for ${title}.${option?'\n'+option:''}\n\nConfirm: ${verifyUrl}\n\nThis link expires in 24 hours. If you did not request this alert, ignore this email.`;
  return {subject,html,text,verifyUrl};
}

export async function sendRestockVerificationEmail(payload,env=process.env,fetcher=fetch){
  if(!restockEmailConfigured(env)) throw new Error('Restock email delivery is not configured.');
  const mail=buildRestockVerificationEmail(payload,env);
  const response=await fetcher('https://api.resend.com/emails',{
    method:'POST',
    headers:{'Authorization':'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'ax-restock-verify-'+String(payload.verificationHash||'').slice(0,32)},
    body:JSON.stringify({from:env.AX_RESTOCK_FROM_EMAIL,to:[payload.email],subject:mail.subject,html:mail.html,text:mail.text}),
    signal:AbortSignal.timeout(10000)
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok || !body?.id) throw new Error('Restock verification email was not accepted.');
  return {id:String(body.id).slice(0,128)};
}

export async function sendRestockEmail(payload,env=process.env,fetcher=fetch){
  if(!restockEmailConfigured(env)) throw new Error('Restock email delivery is not configured.');
  const email=buildRestockEmail(payload,env);
  const response=await fetcher('https://api.resend.com/emails',{
    method:'POST',
    headers:{
      'Authorization':'Bearer '+env.RESEND_API_KEY,
      'Content-Type':'application/json',
      'Idempotency-Key':'ax-restock-'+payload.subscription.id
    },
    body:JSON.stringify({
      from:env.AX_RESTOCK_FROM_EMAIL,
      to:[payload.subscription.email],
      subject:email.subject,
      html:email.html,
      text:email.text
    }),
    signal:AbortSignal.timeout(10000)
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok || !body?.id) throw new Error('Restock email provider rejected the send.');
  return {id:String(body.id).slice(0,128)};
}
