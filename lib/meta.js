import 'server-only';
import {isIP} from 'node:net';
import {META_EVENTS} from './marketing.js';

const text=(value,max=160)=>String(value || '').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const money=value=>{const number=Number(value);return Number.isFinite(number)&&number>=0&&number<10_000_000?number:undefined;};

export function metaPixelId(){
 const value=String(process.env.META_PIXEL_ID || '').trim();
 return /^\d{5,30}$/.test(value)?value:'';
}

export function metaCapiConfigured(){
 return Boolean(metaPixelId() && text(process.env.META_CAPI_ACCESS_TOKEN,4096) && /^v\d+\.\d+$/.test(String(process.env.META_GRAPH_API_VERSION || '').trim()));
}

function safeCurrency(value){const code=text(value,3).toUpperCase();return /^[A-Z]{3}$/.test(code)?code:'INR';}
function safeId(value){return text(value,120).replace(/[^A-Za-z0-9_.:-]/g,'');}
function safeContents(value){
 if(!Array.isArray(value)) return [];
 return value.slice(0,50).map(item=>{
  const id=safeId(item?.id);if(!id)return null;
  const quantity=Math.max(1,Math.min(99,Math.trunc(Number(item?.quantity)||1)));
  const itemPrice=money(item?.item_price);
  return {id,quantity,...(itemPrice===undefined?{}:{item_price:itemPrice})};
 }).filter(Boolean);
}

export function normalizeMetaEvent(input={}) {
 const eventName=text(input.eventName,40);
 if(!META_EVENTS.has(eventName)) throw new Error('Unsupported marketing event.');
 const eventId=text(input.eventId,128);
 if(!/^[A-Za-z0-9_.:-]{8,128}$/.test(eventId)) throw new Error('Invalid marketing event id.');
 let eventSourceUrl='';
 try {
  const candidate=new URL(String(input.eventSourceUrl || ''));
  const expected=new URL(process.env.AX_SITE_ORIGIN || process.env.AX_PUBLIC_SITE_URL || 'https://axstore.in');
  if(candidate.origin!==expected.origin) throw new Error('origin');
  eventSourceUrl=candidate.toString().slice(0,2048);
 } catch { throw new Error('Invalid marketing event source.'); }
 const raw=input.customData && typeof input.customData==='object' && !Array.isArray(input.customData)?input.customData:{};
 const contents=safeContents(raw.contents);
 const ids=Array.isArray(raw.content_ids)?raw.content_ids.map(safeId).filter(Boolean).slice(0,50):contents.map(item=>item.id);
 const value=money(raw.value);
 const numItems=Math.max(0,Math.min(999,Math.trunc(Number(raw.num_items)||0)));
 const customData={
  ...(ids.length?{content_ids:ids}:{}),
  ...(contents.length?{contents}:{}),
  ...(raw.content_type==='product'?{content_type:'product'}:{}),
  ...(text(raw.content_name)?{content_name:text(raw.content_name)}:{}),
  ...(value===undefined?{}:{value}),
  currency:safeCurrency(raw.currency),
  ...(numItems?{num_items:numItems}:{})
 };
 return {eventName,eventId,eventSourceUrl,customData};
}

function cookieValue(request,name){
 const raw=request.headers.get('cookie') || '';
 const pair=raw.split(';').map(item=>item.trim()).find(item=>item.startsWith(name+'='));
 return pair?decodeURIComponent(pair.slice(name.length+1)):'';
}

function userData(request){
 const fbp=text(cookieValue(request,'_fbp'),255),fbc=text(cookieValue(request,'_fbc'),255),ua=text(request.headers.get('user-agent'),512);
 const ipHeader=text(process.env.META_IP_HEADER,80);
 const ip=ipHeader?text(request.headers.get(ipHeader),80):'';
 return {
  ...(ua?{client_user_agent:ua}:{}),
  ...(ip&&isIP(ip)?{client_ip_address:ip}:{}),
  ...(fbp?{fbp}:{}),...(fbc?{fbc}:{})
 };
}

export async function sendMetaEvent(request,event){
 if(!metaCapiConfigured()) return {sent:false};
 const version=String(process.env.META_GRAPH_API_VERSION).trim(),pixelId=metaPixelId(),token=String(process.env.META_CAPI_ACCESS_TOKEN).trim();
 const payload={data:[{
  event_name:event.eventName,event_time:Math.floor(Date.now()/1000),event_id:event.eventId,
  event_source_url:event.eventSourceUrl,action_source:'website',user_data:userData(request),custom_data:event.customData
 }]};
 const testCode=text(process.env.META_CAPI_TEST_EVENT_CODE,100);if(testCode)payload.test_event_code=testCode;
 const response=await fetch(`https://graph.facebook.com/${version}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store',signal:AbortSignal.timeout(8000)
 });
 if(!response.ok) throw new Error('Marketing provider rejected the event.');
 return {sent:true};
}
