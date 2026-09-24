'use client';

import {useEffect,useMemo,useRef} from 'react';
import Link from 'next/link';
import ProductImage from './ProductImage';

const LERP=0.08;
const AUTOPLAY_SPEED=40;
const DRAG_SENSITIVITY=1.4;
const WHEEL_SENSITIVITY=1;

export default function StyledWithAxCarousel({items=[]}) {
 const railRef=useRef(null);
 const currentRef=useRef(0);
 const targetRef=useRef(0);
 const loopWidthRef=useRef(0);
 const draggingRef=useRef(false);
 const pointerIdRef=useRef(null);
 const lastXRef=useRef(0);
 const lastTimeRef=useRef(0);
 const velocityRef=useRef(0);
 const pauseUntilRef=useRef(0);
 const reducedMotionRef=useRef(false);
 const loopItems=useMemo(()=>[...items,...items,...items],[items]);

 useEffect(()=>{
  const rail=railRef.current;
  if(!rail || !items.length) return;

  reducedMotionRef.current=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame=0;
  let lastFrame=performance.now();

  const cards=()=>Array.from(rail.querySelectorAll('.styled-with-ax-card'));

  function measure(){
   const all=cards();
   if(all.length>items.length){
    loopWidthRef.current=all[items.length].offsetLeft-all[0].offsetLeft;
    if(loopWidthRef.current>0 && currentRef.current===0){
     currentRef.current=loopWidthRef.current;
     targetRef.current=loopWidthRef.current;
     rail.scrollLeft=loopWidthRef.current;
    }
   }
  }

  function wrap(){
   const loop=loopWidthRef.current;
   if(!loop) return;
   if(currentRef.current>=loop*2){
    currentRef.current-=loop;
    targetRef.current-=loop;
   } else if(currentRef.current<loop*.12){
    currentRef.current+=loop;
    targetRef.current+=loop;
   }
  }

  function transformCards(){
   const bounds=rail.getBoundingClientRect();
   const center=bounds.left+bounds.width/2;
   const half=Math.max(1,bounds.width/2);

   cards().forEach(card=>{
    const rect=card.getBoundingClientRect();
    const normalized=Math.max(-1.1,Math.min(1.1,(rect.left+rect.width/2-center)/half));
    const distance=Math.min(1,Math.abs(normalized));
    const rotation=-normalized*18;
    const scale=1-distance*.08;
    const lift=distance*18;
    const depth=-distance*90;
    const zTilt=normalized*distance*1.4;

    card.style.setProperty('--rb-rotate',rotation.toFixed(2)+'deg');
    card.style.setProperty('--rb-scale',scale.toFixed(3));
    card.style.setProperty('--rb-lift',lift.toFixed(2)+'px');
    card.style.setProperty('--rb-depth',depth.toFixed(2)+'px');
    card.style.setProperty('--rb-ztilt',zTilt.toFixed(2)+'deg');
   });
  }

  function tick(now){
   const dt=Math.min(48,now-lastFrame);
   lastFrame=now;

   if(!draggingRef.current && now>=pauseUntilRef.current && !document.hidden && !reducedMotionRef.current){
    targetRef.current+=AUTOPLAY_SPEED*(dt/1000);
   }

   const smoothing=reducedMotionRef.current?1:LERP;
   currentRef.current+=(targetRef.current-currentRef.current)*smoothing;
   wrap();
   rail.scrollLeft=currentRef.current;
   transformCards();
   frame=requestAnimationFrame(tick);
  }

  const observer=new ResizeObserver(()=>{measure();transformCards();});
  observer.observe(rail);
  measure();
  transformCards();
  frame=requestAnimationFrame(tick);

  return ()=>{
   cancelAnimationFrame(frame);
   observer.disconnect();
  };
 },[items]);

 function pause(ms=1200){
  pauseUntilRef.current=performance.now()+ms;
 }

 function onPointerDown(event){
  const rail=railRef.current;
  if(!rail) return;
  draggingRef.current=true;
  pointerIdRef.current=event.pointerId;
  lastXRef.current=event.clientX;
  lastTimeRef.current=performance.now();
  velocityRef.current=0;
  pause(100000);
  rail.setPointerCapture?.(event.pointerId);
 }

 function onPointerMove(event){
  if(!draggingRef.current || event.pointerId!==pointerIdRef.current) return;
  const now=performance.now();
  const dx=event.clientX-lastXRef.current;
  const dt=Math.max(1,now-lastTimeRef.current);
  targetRef.current-=dx*DRAG_SENSITIVITY;
  velocityRef.current=(-dx/dt)*DRAG_SENSITIVITY;
  lastXRef.current=event.clientX;
  lastTimeRef.current=now;
 }

 function endDrag(event){
  if(!draggingRef.current) return;
  draggingRef.current=false;
  if(event?.pointerId!=null) railRef.current?.releasePointerCapture?.(event.pointerId);
  pointerIdRef.current=null;
  targetRef.current+=velocityRef.current*260;
  pause(1200);
 }

 function onWheel(event){
  const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
  if(!delta) return;
  targetRef.current+=delta*WHEEL_SENSITIVITY;
  pause(850);
 }

 function onKeyDown(event){
  if(event.key==='ArrowRight'){
   event.preventDefault();
   targetRef.current+=Math.max(240,(railRef.current?.clientWidth||400)*.55);
   pause(1200);
  }
  if(event.key==='ArrowLeft'){
   event.preventDefault();
   targetRef.current-=Math.max(240,(railRef.current?.clientWidth||400)*.55);
   pause(1200);
  }
 }

 return <div className="styled-with-ax-carousel">
  <div
   ref={railRef}
   className="styled-with-ax-rail"
   onPointerDown={onPointerDown}
   onPointerMove={onPointerMove}
   onPointerUp={endDrag}
   onPointerCancel={endDrag}
   onWheel={onWheel}
   onFocusCapture={()=>pause(2200)}
   onMouseEnter={()=>pause(900)}
   onKeyDown={onKeyDown}
   tabIndex={0}
   aria-label="Styled with AX gallery"
  >
   {loopItems.map((item,index)=>{
    const copy=Math.floor(index/items.length);
    const media=<>
     <div className="styled-with-ax-media"><ProductImage src={item.src} alt={item.alt || item.title || 'Styled with AX'} sizes="(max-width:700px) 58vw, 360px"/></div>
     <div className="styled-with-ax-meta"><span>{item.label || 'STYLED WITH AX'}</span>{item.title && <span>{item.title}</span>}</div>
    </>;

    return item.href
     ? <Link className="styled-with-ax-card" href={item.href} key={`${item.src}-${copy}`} aria-hidden={copy!==1} tabIndex={copy===1?0:-1}>{media}</Link>
     : <article className="styled-with-ax-card" key={`${item.src}-${copy}`} aria-hidden={copy!==1}>{media}</article>;
   })}
  </div>
 </div>;
}
