'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {MARKETING_CONSENT_COOKIE,MARKETING_DENIED,MARKETING_GRANTED} from '../lib/marketing.js';
import './marketing.css';

function readConsent(){
 if(typeof document==='undefined')return '';
 const pair=document.cookie.split(';').map(item=>item.trim()).find(item=>item.startsWith(MARKETING_CONSENT_COOKIE+'='));
 return pair?decodeURIComponent(pair.slice(MARKETING_CONSENT_COOKIE.length+1)):'';
}
function currentConsent(){const value=readConsent();return value===MARKETING_GRANTED||value===MARKETING_DENIED?value:'';}
function writeConsent(value){
 const secure=typeof location!=='undefined'&&location.protocol==='https:'?'; Secure':'';
 document.cookie=`${MARKETING_CONSENT_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=15552000; SameSite=Lax${secure}`;
}
function eventId(){
 try{return crypto.randomUUID();}catch{return `ax-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
}
function sendBrowserEvent(eventName,customData,id){
 if(typeof window==='undefined')return;
 if(window.fbq) window.fbq('track',eventName,customData || {},{eventID:id});
 else {
  window.__axPendingMarketing=window.__axPendingMarketing || [];
  window.__axPendingMarketing.push({eventName,customData,id});
 }
}
function flushPending(){
 if(typeof window==='undefined'||!window.fbq)return;
 const pending=Array.isArray(window.__axPendingMarketing)?window.__axPendingMarketing.splice(0):[];
 for(const item of pending) window.fbq('track',item.eventName,item.customData || {},{eventID:item.id});
}
function ensurePixel(pixelId){
 if(typeof window==='undefined'||!pixelId)return;
 if(!window.fbq){
  const fbq=function(){fbq.callMethod?fbq.callMethod.apply(fbq,arguments):fbq.queue.push(arguments);};
  fbq.push=fbq;fbq.loaded=true;fbq.version='2.0';fbq.queue=[];window.fbq=fbq;
  const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';script.dataset.axMarketing='true';
  document.head.appendChild(script);
 }
 if(window.__axMetaPixelId!==pixelId){window.fbq('init',pixelId);window.__axMetaPixelId=pixelId;}
 flushPending();
}

export function trackMarketingEvent(eventName,customData={}){
 if(typeof window==='undefined'||currentConsent()!==MARKETING_GRANTED)return '';
 const id=eventId();sendBrowserEvent(eventName,customData,id);
 if(window.__axMetaCapiEnabled===true){
  fetch('/api/meta/events',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({eventName,eventId:id,eventSourceUrl:window.location.href,customData})}).catch(()=>{});
 }
 return id;
}

export default function MetaMarketing({pixelId='',capiEnabled=false,analyticsEnabled=false,googleAnalyticsId=''}){
 const pathname=usePathname();
 const [consent,setConsent]=useState('');
 const [open,setOpen]=useState(false);
 const lastPath=useRef('');
 useEffect(()=>{
  if(!pixelId&&!analyticsEnabled&&!googleAnalyticsId)return;
  const current=currentConsent();setConsent(current);setOpen(!current);
  window.__axMarketingAvailable=true;window.__axMetaCapiEnabled=Boolean(capiEnabled);
  const reopen=()=>setOpen(true);window.addEventListener('ax:open-marketing-preferences',reopen);
  window.dispatchEvent(new Event('ax:marketing-ready'));
  return()=>window.removeEventListener('ax:open-marketing-preferences',reopen);
 },[pixelId,capiEnabled,analyticsEnabled,googleAnalyticsId]);
 useEffect(()=>{if(pixelId&&consent===MARKETING_GRANTED)ensurePixel(pixelId);},[pixelId,consent]);
 useEffect(()=>{
  if(!pixelId||consent!==MARKETING_GRANTED||!pathname||lastPath.current===pathname)return;
  lastPath.current=pathname;trackMarketingEvent('PageView');
 },[pathname,pixelId,consent]);
 if((!pixelId&&!analyticsEnabled&&!googleAnalyticsId)||!open)return null;
 const choose=value=>{writeConsent(value);if(value===MARKETING_GRANTED)lastPath.current='';setConsent(value);setOpen(false);if(value===MARKETING_GRANTED&&pixelId)ensurePixel(pixelId);window.dispatchEvent(new Event('ax:marketing-consent-changed'));};
 return <aside className="marketing-consent" role="dialog" aria-label="Marketing cookie choices" aria-live="polite">
  <div><strong>Your privacy choices.</strong><p>Optional analytics and marketing cookies help AX understand site performance, product discovery and which promotions lead to visits or purchases. You can accept them or keep only essential cookies.</p><Link href="/policies">Privacy details</Link></div>
  <div className="marketing-consent-actions"><button type="button" className="underlined-link" onClick={()=>choose(MARKETING_DENIED)}>ONLY ESSENTIAL</button><button type="button" className="solid-button" onClick={()=>choose(MARKETING_GRANTED)}>ACCEPT MARKETING</button>{consent&&<button type="button" className="marketing-close" onClick={()=>setOpen(false)} aria-label="Close marketing preferences">Close</button>}</div>
 </aside>;
}
