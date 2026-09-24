'use client';
import dynamic from 'next/dynamic';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';

const AXPlayroom=dynamic(()=>import('./AXPlayroom'),{ssr:false});
const TEASER_KEY='ax:playroom-teaser:v2';

export default function AXPlayroomMount(){
 const path=usePathname();
 const checked=useRef(false);
 const [status,setStatus]=useState(null);
 const [show,setShow]=useState(false);

 const eligiblePath=/^\/(?:$|products(?:\/|$)|collections(?:\/|$))/.test(path || '');

 useEffect(()=>{
  if(!eligiblePath || checked.current) return;
  const controller=new AbortController();
  checked.current=true;
  fetch('/api/playroom',{cache:'no-store',credentials:'same-origin',signal:controller.signal})
   .then(response=>response.ok?response.json():null)
   .then(data=>{if(data?.available&&data?.eligible)setStatus(data);})
   .catch(error=>{if(error?.name!=='AbortError')checked.current=false;});
  return()=>controller.abort();
 },[eligiblePath]);

 useEffect(()=>{
  if(!eligiblePath || !status || show) return;
  let timer=0;
  let direct=false;
  try{direct=new URLSearchParams(window.location.search).get('play')==='1';}catch{}
  let seen=false;
  try{seen=Boolean(window.sessionStorage.getItem(TEASER_KEY));}catch{}
  const delay=direct?0:(seen?1400:4200);
  timer=window.setTimeout(()=>{
   try{window.sessionStorage.setItem(TEASER_KEY,'1');}catch{}
   setShow(true);
  },delay);
  return()=>window.clearTimeout(timer);
 },[eligiblePath,status,show]);

 return show&&status?<AXPlayroom initialStatus={status}/>:null;
}
