import 'server-only';

function mailbox(value=''){
  const raw=String(value||'').trim();
  return raw.match(/<([^>]+)>/)?.[1] || raw;
}
function validEmail(value=''){return /^[^\s<>]+@[^\s<>]+$/.test(mailbox(value));}
function fromEmail(env=process.env){
  return String(env.AX_STYLIST_ALERT_FROM_EMAIL || env.AX_RESTOCK_FROM_EMAIL || '').trim();
}
export function stylistAlertConfigured(env=process.env){
  return String(env.RESEND_API_KEY||'').startsWith('re_')
    && validEmail(env.AX_STYLIST_ALERT_EMAIL)
    && validEmail(fromEmail(env));
}
export function buildStylistQuotaAlert({level,used,limit,warningPercent=80,date=''}) {
  const safeLevel=level==='limit'?'limit':'warning';
  const safeLimit=Math.max(1,Number(limit)||1),safeUsed=Math.max(0,Number(used)||0);
  const percent=Math.min(100,Math.round((safeUsed/safeLimit)*100));
  const title=safeLevel==='limit'?'AX Stylist daily limit reached':'AX Stylist usage warning';
  const subject=safeLevel==='limit'
    ? `AX Stylist reached its daily limit (${safeUsed}/${safeLimit})`
    : `AX Stylist is at ${percent}% of today’s limit (${safeUsed}/${safeLimit})`;
  const action=safeLevel==='limit'
    ? 'New Stylist requests are now blocked by the shared daily ceiling until the next UTC day.'
    : `The warning threshold is ${Number(warningPercent)||80}%. Stylist is still available.`;
  const text=`AX MEN'S STORE\n\n${title}\n\nUsage: ${safeUsed} / ${safeLimit} requests (${percent}%).\n${date?`UTC day: ${date}.\n`:''}${action}\n\nReview OpenAI usage and AX Stylist traffic before raising the limit.`;
  const html=`<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111;background:#fff;margin:0;padding:28px">
  <div style="max-width:560px;margin:0 auto">
    <p style="font-size:11px;letter-spacing:.14em;margin:0 0 22px">AX MEN'S STORE · STYLIST</p>
    <h1 style="font-size:28px;font-weight:500;line-height:1.15;margin:0 0 16px">${title}</h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 8px"><strong>${safeUsed} / ${safeLimit}</strong> requests used (${percent}%).</p>
    ${date?`<p style="font-size:13px;color:#666;margin:0 0 18px">UTC day: ${date}</p>`:''}
    <p style="font-size:14px;line-height:1.7;margin:0 0 18px">${action}</p>
    <p style="font-size:12px;color:#777;line-height:1.6">Review OpenAI usage and AX Stylist traffic before raising the limit. This alert contains no customer prompt, photo, profile or identity data.</p>
  </div></body></html>`;
  return {subject,text,html,level:safeLevel,percent};
}
export async function sendStylistQuotaAlert(payload,env=process.env,fetcher=fetch){
  if(!stylistAlertConfigured(env)) throw new Error('Stylist quota alert email is not configured.');
  const mail=buildStylistQuotaAlert(payload);
  const date=String(payload.date||new Date().toISOString().slice(0,10)).replace(/[^0-9-]/g,'').slice(0,10);
  const response=await fetcher('https://api.resend.com/emails',{
    method:'POST',
    headers:{
      Authorization:'Bearer '+env.RESEND_API_KEY,
      'Content-Type':'application/json',
      'Idempotency-Key':`ax-stylist-${mail.level}-${date}`
    },
    body:JSON.stringify({
      from:fromEmail(env),
      to:[String(env.AX_STYLIST_ALERT_EMAIL).trim()],
      subject:mail.subject,
      html:mail.html,
      text:mail.text
    }),
    signal:AbortSignal.timeout(5000)
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok || !body?.id) throw new Error('Stylist quota alert email was not accepted.');
  return {id:String(body.id).slice(0,128)};
}
