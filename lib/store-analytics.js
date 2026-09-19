import {MARKETING_CONSENT_COOKIE,MARKETING_GRANTED} from './marketing.js';

function consentGranted(){
  if(typeof document==='undefined') return false;
  const pair=document.cookie.split(';').map(value=>value.trim()).find(value=>value.startsWith(MARKETING_CONSENT_COOKIE+'='));
  return pair ? decodeURIComponent(pair.slice(MARKETING_CONSENT_COOKIE.length+1))===MARKETING_GRANTED : false;
}

export function trackStoreEvent(eventName,{productHandle='',value=null,currency='INR',metadata={}}={}) {
  if(typeof window==='undefined' || !consentGranted()) return;
  const payload={
    eventName,
    path:window.location.pathname,
    productHandle:String(productHandle || '').slice(0,160),
    ...(Number.isFinite(Number(value))?{value:Number(value)}:{}),
    currency:String(currency || 'INR').toUpperCase().slice(0,3),
    metadata:metadata && typeof metadata==='object' && !Array.isArray(metadata)?metadata:{}
  };
  fetch('/api/analytics/events',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify(payload)}).catch(()=>{});
}
