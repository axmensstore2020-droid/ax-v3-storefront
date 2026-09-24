'use client';

import {useEffect,useMemo,useRef} from 'react';
import {motion,useAnimationFrame,useMotionValue} from 'motion/react';
import Link from 'next/link';
import ProductImage from './ProductImage';

const EASE=.075;
const TOUCH_EASE=.22;
const AUTOPLAY_SPEED=14;
const DRAG_SENSITIVITY=1;
const FLICK_MS=190;
const SNAP_IDLE_MS=520;
const AUTO_RESUME_MS=1800;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export default function StyledWithAxCarousel({items=[]}) {
 const viewportRef=useRef(null);
 const trackRef=useRef(null);
 const x=useMotionValue(0);
 const currentRef=useRef(0);
 const targetRef=useRef(0);
 const loopWidthRef=useRef(0);
 const measuredRef=useRef(false);
 const draggingRef=useRef(false);
 const pointerIdRef=useRef(null);
 const lastXRef=useRef(0);
 const lastTimeRef=useRef(0);
 const velocityRef=useRef(0);
 const lastInputRef=useRef(0);
 const autoResumeRef=useRef(0);
 const snapDoneRef=useRef(true);
 const reducedMotionRef=useRef(false);
 const loopItems=useMemo(()=>[...items,...items,...items],[items]);

 useEffect(()=>{
  const viewport=viewportRef.current,track=trackRef.current;
  if(!viewport || !track || !items.length) return;

  reducedMotionRef.current=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function measure(){
   const cards=Array.from(track.children);
   if(cards.length<=items.length) return;
   const loop=cards[items.length].offsetLeft-cards[0].offsetLeft;
   if(!loop) return;
   loopWidthRef.current=loop;
   if(!measuredRef.current){
    currentRef.current=loop;
    targetRef.current=loop;
    x.jump(-loop);
    measuredRef.current=true;
   }
  }

  const observer=new ResizeObserver(measure);
  observer.observe(viewport);
  observer.observe(track);
  measure();
  return ()=>observer.disconnect();
 },[items,x]);

 function markInput(){
  const now=performance.now();
  lastInputRef.current=now;
  autoResumeRef.current=now+AUTO_RESUME_MS;
  snapDoneRef.current=false;
 }

 function wrap(){
  const loop=loopWidthRef.current;
  if(!loop) return;
  if(currentRef.current>=loop*2){
   currentRef.current-=loop;
   targetRef.current-=loop;
  }else if(currentRef.current<loop*.35){
   currentRef.current+=loop;
   targetRef.current+=loop;
  }
 }

 function snapNearest(){
  const viewport=viewportRef.current,track=trackRef.current;
  if(!viewport || !track) return;
  const center=viewport.clientWidth/2;
  let best=null,bestDistance=Infinity;

  Array.from(track.children).forEach(card=>{
   const cardCenter=card.offsetLeft+card.offsetWidth/2-currentRef.current;
   const distance=Math.abs(cardCenter-center);
   if(distance<bestDistance){
    bestDistance=distance;
    best=card;
   }
  });

  if(best){
   targetRef.current=best.offsetLeft+best.offsetWidth/2-center;
   snapDoneRef.current=true;
  }
 }

 function updateEdgeLens(){
  const viewport=viewportRef.current,track=trackRef.current;
  if(!viewport || !track) return;

  const width=viewport.clientWidth;
  const edgeZone=clamp(width*.115,42,110);

  Array.from(track.children).forEach(card=>{
   const center=card.offsetLeft+card.offsetWidth/2-currentRef.current;
   const leftFx=clamp((edgeZone-center)/edgeZone,0,1);
   const rightFx=clamp((center-(width-edgeZone))/edgeZone,0,1);
   const edge=Math.max(leftFx,rightFx);
   const tilt=(leftFx-rightFx)*18;

   card.style.setProperty('--ax-edge',edge.toFixed(3));
   card.style.setProperty('--ax-tilt',tilt.toFixed(2)+'deg');
   card.style.transformOrigin=leftFx>rightFx?'100% 50%':rightFx>leftFx?'0% 50%':'50% 50%';
  });
 }

 useAnimationFrame((time,delta)=>{
  if(!measuredRef.current) return;
  const dt=Math.min(48,Math.max(0,delta));

  if(!draggingRef.current){
   if(!snapDoneRef.current && time-lastInputRef.current>=SNAP_IDLE_MS){
    snapNearest();
   }
   if(!reducedMotionRef.current && time>=autoResumeRef.current){
    targetRef.current+=AUTOPLAY_SPEED*(dt/1000);
   }
  }

  const ease=draggingRef.current?TOUCH_EASE:EASE;
  currentRef.current+=(targetRef.current-currentRef.current)*ease;
  wrap();
  x.set(-currentRef.current);
  updateEdgeLens();
 });

 function onPointerDown(event){
  const viewport=viewportRef.current;
  if(!viewport) return;
  draggingRef.current=true;
  pointerIdRef.current=event.pointerId;
  lastXRef.current=event.clientX;
  lastTimeRef.current=performance.now();
  velocityRef.current=0;
  markInput();
  viewport.setPointerCapture?.(event.pointerId);
 }

 function onPointerMove(event){
  if(!draggingRef.current || event.pointerId!==pointerIdRef.current) return;
  const now=performance.now();
  const dx=event.clientX-lastXRef.current;
  const dt=Math.max(1,now-lastTimeRef.current);
  targetRef.current-=dx*DRAG_SENSITIVITY;
  const instantaneous=(-dx/dt)*DRAG_SENSITIVITY;
  velocityRef.current=velocityRef.current*.62+instantaneous*.38;
  lastXRef.current=event.clientX;
  lastTimeRef.current=now;
  markInput();
 }

 function endDrag(event){
  if(!draggingRef.current) return;
  draggingRef.current=false;
  if(event?.pointerId!=null) viewportRef.current?.releasePointerCapture?.(event.pointerId);
  pointerIdRef.current=null;
  targetRef.current+=velocityRef.current*FLICK_MS;
  markInput();
 }

 function onWheel(event){
  const delta=Math.abs(event.deltaX)>1?event.deltaX:(event.shiftKey?event.deltaY:0);
  if(!delta) return;
  targetRef.current+=delta;
  markInput();
 }

 function onKeyDown(event){
  if(!viewportRef.current) return;
  if(event.key==='ArrowRight'){
   event.preventDefault();
   targetRef.current+=viewportRef.current.clientWidth*.42;
   markInput();
  }
  if(event.key==='ArrowLeft'){
   event.preventDefault();
   targetRef.current-=viewportRef.current.clientWidth*.42;
   markInput();
  }
 }

 return <div className="styled-with-ax-carousel">
  <div
   ref={viewportRef}
   className="styled-with-ax-viewport"
   onPointerDown={onPointerDown}
   onPointerMove={onPointerMove}
   onPointerUp={endDrag}
   onPointerCancel={endDrag}
   onWheel={onWheel}
   onKeyDown={onKeyDown}
   tabIndex={0}
   aria-label="Styled with AX gallery"
  >
   <motion.div ref={trackRef} className="styled-with-ax-track" style={{x}}>
    {loopItems.map((item,index)=>{
     const copy=Math.floor(index/items.length);
     const media=<>
      <div className="styled-with-ax-media" style={{'--ax-aspect':String(item.aspect || .75)}}>
       <ProductImage src={item.src} alt={item.alt || item.title || 'Styled with AX'} sizes="(max-width:700px) 34vw, 240px"/>
      </div>
      <div className="styled-with-ax-meta"><span>{item.label || 'STYLED WITH AX'}</span>{item.title && <span>{item.title}</span>}</div>
     </>;

     return item.href
      ? <Link className="styled-with-ax-card" href={item.href} key={`${item.src}-${copy}`} aria-hidden={copy!==1} tabIndex={copy===1?0:-1}>{media}</Link>
      : <article className="styled-with-ax-card" key={`${item.src}-${copy}`} aria-hidden={copy!==1}>{media}</article>;
    })}
   </motion.div>
  </div>
 </div>;
}
