'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {MARKETING_CONSENT_COOKIE,MARKETING_GRANTED} from '../lib/marketing.js';

const ALLOWED_HOSTS=new Set(['axstore.in','www.axstore.in']);

function consentGranted(){
  if(typeof document==='undefined')return false;
  const pair=document.cookie.split(';').map(item=>item.trim()).find(item=>item.startsWith(MARKETING_CONSENT_COOKIE+'='));
  return pair?decodeURIComponent(pair.slice(MARKETING_CONSENT_COOKIE.length+1))===MARKETING_GRANTED:false;
}

function validMeasurementId(value){
  return /^G-[A-Z0-9]{6,20}$/.test(String(value||'').trim());
}

function ensureGoogleTag(measurementId){
  if(typeof window==='undefined'||!validMeasurementId(measurementId)||!ALLOWED_HOSTS.has(window.location.hostname))return false;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
  if(window.__axGoogleAnalyticsId!==measurementId){
    window.gtag('js',new Date());
    window.gtag('config',measurementId,{send_page_view:false});
    window.__axGoogleAnalyticsId=measurementId;
  }
  if(!document.querySelector('script[data-ax-google-analytics]')){
    const script=document.createElement('script');
    script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(measurementId);
    script.dataset.axGoogleAnalytics='true';
    document.head.appendChild(script);
  }
  return true;
}

export default function GoogleAnalytics({measurementId=''}) {
  const pathname=usePathname();
  const [granted,setGranted]=useState(false);
  const lastPath=useRef('');

  useEffect(()=>{
    const sync=()=>setGranted(consentGranted());
    sync();
    window.addEventListener('ax:marketing-consent-changed',sync);
    return()=>window.removeEventListener('ax:marketing-consent-changed',sync);
  },[]);

  useEffect(()=>{
    if(!granted||!validMeasurementId(measurementId)||!pathname||lastPath.current===pathname)return;
    if(!ensureGoogleTag(measurementId))return;
    lastPath.current=pathname;
    window.gtag('event','page_view',{
      page_title:document.title,
      page_location:window.location.href,
      page_path:pathname
    });
  },[pathname,granted,measurementId]);

  return null;
}
