import 'server-only';

function digits(value=''){return String(value || '').replace(/\D/g,'');}

export function normalizeWhatsappPhone(value=''){
  const raw=String(value || '').trim();
  if(!raw)return '';
  let number=digits(raw);
  if(number.startsWith('00')) number=number.slice(2);
  if(number.length===10) number='91'+number;
  if(number.length<8 || number.length>15 || number.startsWith('0')) return '';
  return '+'+number;
}

export function whatsappBusinessConfig(env=process.env){
  const phoneNumberId=String(env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID || '').trim();
  const accessToken=String(env.WHATSAPP_BUSINESS_ACCESS_TOKEN || '').trim();
  const apiVersion=String(env.WHATSAPP_BUSINESS_API_VERSION || '').trim();
  return {phoneNumberId,accessToken,apiVersion,enabled:Boolean(phoneNumberId && accessToken && /^v\d+\.\d+$/.test(apiVersion))};
}

export async function sendWhatsappTemplate({to,template,language='en',components=[]},{env=process.env,fetcher=fetch}={}){
  const config=whatsappBusinessConfig(env),phone=normalizeWhatsappPhone(to);
  if(!config.enabled) throw new Error('WhatsApp Business is not configured.');
  if(!phone) throw new Error('Invalid WhatsApp number.');
  const name=String(template || '').trim();
  if(!/^[a-z0-9_]{1,512}$/.test(name)) throw new Error('Invalid WhatsApp template.');
  const response=await fetcher(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,{
    method:'POST',
    headers:{Authorization:`Bearer ${config.accessToken}`,'Content-Type':'application/json'},
    body:JSON.stringify({messaging_product:'whatsapp',to:phone.slice(1),type:'template',template:{name,language:{code:String(language || 'en').slice(0,10)},components:Array.isArray(components)?components.slice(0,10):[]}}),
    cache:'no-store',
    signal:AbortSignal.timeout(10000)
  });
  if(!response.ok) throw new Error('WhatsApp message could not be sent.');
  return response.json();
}
