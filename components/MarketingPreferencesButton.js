'use client';
import {useEffect,useState} from 'react';
export default function MarketingPreferencesButton(){
 const [available,setAvailable]=useState(false);
 useEffect(()=>{
  const sync=()=>setAvailable(window.__axMarketingAvailable===true);sync();
  window.addEventListener('ax:marketing-ready',sync);return()=>window.removeEventListener('ax:marketing-ready',sync);
 },[]);
 if(!available)return null;
 return <button type="button" className="footer-link-button" onClick={()=>window.dispatchEvent(new Event('ax:open-marketing-preferences'))}>Cookie choices</button>;
}
