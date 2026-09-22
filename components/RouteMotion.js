'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {animate} from 'motion';
import {AX_MOTION} from '../lib/motion';
import AXParticleLoader from './AXParticleLoader';

const RETURN_KEY='ax_motion_return_v1';
const MAX_RETURN_AGE=30*60*1000;

function reducedMotion(){
  return typeof window!=='undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function currentPath(){
  return typeof window==='undefined'?'':window.location.pathname+window.location.search;
}
function readReturn(){
  try{
    const value=JSON.parse(sessionStorage.getItem(RETURN_KEY)||'null');
    if(!value || typeof value.path!=='string' || !Number.isFinite(Number(value.y))) return null;
    if(Date.now()-Number(value.at||0)>MAX_RETURN_AGE) return null;
    return value;
  }catch{return null;}
}
function restoreListingScroll(){
  const saved=readReturn();
  if(!saved || saved.path!==currentPath()) return false;
  window.scrollTo({top:Math.max(0,Number(saved.y)||0),left:0,behavior:'auto'});
  return true;
}

export default function RouteMotion(){
  const pathname=usePathname();
  const [routeLoading,setRouteLoading]=useState(false);
  const initial=useRef(true),historyTraversal=useRef(false),active=useRef(new Set()),loaderTimer=useRef(null),loaderSafety=useRef(null);

  useEffect(()=>{
    function track(controls){
      active.current.add(controls);
      controls.then?.(()=>active.current.delete(controls));
      return controls;
    }
    function onClick(event){
      if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target=event.target instanceof Element?event.target:null;
      const anchor=target?.closest?.('a[href]');
      if(!anchor || anchor.target==='_blank' || anchor.hasAttribute('download')) return;

      let url;
      try{url=new URL(anchor.href,window.location.href);}catch{return;}
      if(url.origin!==window.location.origin) return;

      if(url.pathname!==window.location.pathname){
        clearTimeout(loaderTimer.current);
        clearTimeout(loaderSafety.current);
        loaderTimer.current=setTimeout(()=>{
          setRouteLoading(true);
          loaderSafety.current=setTimeout(()=>setRouteLoading(false),6000);
        },160);
      }

      const card=anchor.closest('.product-card');
      if(!card || !/^\/products\/[^/]+\/?$/.test(url.pathname)) return;

      try{
        sessionStorage.setItem(RETURN_KEY,JSON.stringify({
          path:currentPath(),
          y:window.scrollY,
          handle:decodeURIComponent(url.pathname.split('/').filter(Boolean).pop()||''),
          at:Date.now()
        }));
      }catch{}

      if(reducedMotion()) return;
      const image=card.querySelector('.product-image-wrap');
      if(!image) return;
      image.style.willChange='opacity, transform';
      const controls=track(animate(
        image,
        {opacity:[1,.92],transform:['translate3d(0,0,0) scale(1)','translate3d(0,1px,0) scale(.992)']},
        AX_MOTION.journey
      ));
      controls.then?.(()=>{
        image.style.willChange='';
        image.style.opacity='';
        image.style.transform='';
      });
    }
    function scheduleRestore(){
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(!restoreListingScroll()){
          setTimeout(()=>restoreListingScroll(),80);
        }
      }));
    }
    function onPopState(){
      historyTraversal.current=true;
      scheduleRestore();
    }

    document.addEventListener('click',onClick,true);
    window.addEventListener('popstate',onPopState);
    return()=>{
      document.removeEventListener('click',onClick,true);
      window.removeEventListener('popstate',onPopState);
      clearTimeout(loaderTimer.current);
      clearTimeout(loaderSafety.current);
      for(const controls of active.current) controls.stop?.();
      active.current.clear();
    };
  },[]);

  useEffect(()=>{
    clearTimeout(loaderTimer.current);
    clearTimeout(loaderSafety.current);
    setRouteLoading(false);
    if(initial.current){
      initial.current=false;
      return;
    }

    if(historyTraversal.current){
      historyTraversal.current=false;
      requestAnimationFrame(()=>requestAnimationFrame(()=>restoreListingScroll()));
    }

    if(reducedMotion()) return;
    const frame=requestAnimationFrame(()=>{
      const main=document.getElementById('main-content');
      if(!main) return;
      main.style.willChange='opacity, transform';
      const controls=animate(
        main,
        {opacity:[.975,1],transform:['translate3d(0,3px,0)','translate3d(0,0,0)']},
        AX_MOTION.route
      );
      active.current.add(controls);
      controls.then?.(()=>{
        active.current.delete(controls);
        main.style.willChange='';
        main.style.opacity='';
        main.style.transform='';
      });
    });
    return()=>cancelAnimationFrame(frame);
  },[pathname]);

  return routeLoading ? <div className="ax-route-transition-loader" aria-busy="true"><AXParticleLoader variant="route" label="Loading AX" /></div> : null;
}
