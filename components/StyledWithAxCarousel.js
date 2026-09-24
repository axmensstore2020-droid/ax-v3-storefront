'use client';

import {useEffect,useMemo,useRef} from 'react';
import Link from 'next/link';
import ProductImage from './ProductImage';

const sizePattern=['wide','small','long','big','medium','wide','small','long','big','medium'];

export default function StyledWithAxCarousel({items=[]}) {
 const railRef=useRef(null);
 const pauseUntilRef=useRef(0);
 const loopWidthRef=useRef(0);
 const reducedMotionRef=useRef(false);
 const loopItems=useMemo(()=>[...items,...items,...items],[items]);

 useEffect(()=>{
  const rail=railRef.current;
  if(!rail || !items.length) return;

  reducedMotionRef.current=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame=0,last=performance.now();
  const cards=()=>Array.from(rail.querySelectorAll('.styled-with-ax-card'));

  function measure(){
   const all=cards();
   if(all.length>items.length){
    loopWidthRef.current=all[items.length].offsetLeft-all[0].offsetLeft;
    if(loopWidthRef.current>0 && rail.scrollLeft<loopWidthRef.current*.2) rail.scrollLeft=loopWidthRef.current;
   }
  }

  function bend(){
   const railRect=rail.getBoundingClientRect();
   const center=railRect.left+railRect.width/2;
   const half=Math.max(1,railRect.width/2);
   cards().forEach(card=>{
    const rect=card.getBoundingClientRect();
    const normalized=Math.max(-1.15,Math.min(1.15,(rect.left+rect.width/2-center)/half));
    const distance=Math.abs(normalized);
    const edge=Math.max(0,Math.min(1,(distance-.48)/.52));
    const tilt=-normalized*edge*18;
    const lift=edge*7;
    const scale=1-edge*.045;
    card.style.setProperty('--ax-edge',edge.toFixed(3));
    card.style.setProperty('--ax-tilt',tilt.toFixed(2)+'deg');
    card.style.setProperty('--ax-lift',lift.toFixed(2)+'px');
    card.style.setProperty('--ax-scale',scale.toFixed(3));
   });
  }

  function tick(now){
   const dt=Math.min(48,now-last);
   last=now;
   const loop=loopWidthRef.current;

   if(loop>0){
    if(rail.scrollLeft>=loop*2) rail.scrollLeft-=loop;
    else if(rail.scrollLeft<loop*.12) rail.scrollLeft+=loop;

    if(!reducedMotionRef.current && !document.hidden && now>=pauseUntilRef.current){
     rail.scrollLeft+=dt*.026;
    }
   }

   bend();
   frame=requestAnimationFrame(tick);
  }

  const resizeObserver=new ResizeObserver(()=>{measure();bend();});
  resizeObserver.observe(rail);
  measure();
  bend();
  frame=requestAnimationFrame(tick);

  return ()=>{
   cancelAnimationFrame(frame);
   resizeObserver.disconnect();
  };
 },[items]);

 function pause(ms=1800){
  pauseUntilRef.current=performance.now()+ms;
 }

 function move(direction){
  const rail=railRef.current;
  if(!rail) return;
  pause(2600);
  rail.scrollBy({left:direction*Math.max(220,rail.clientWidth*.58),behavior:'smooth'});
 }

 function onKeyDown(event){
  if(event.key==='ArrowRight'){event.preventDefault();move(1);}
  if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}
 }

 return <div className="styled-with-ax-carousel">
  <div
   ref={railRef}
   className="styled-with-ax-rail"
   onPointerDown={()=>pause(100000)}
   onPointerUp={()=>pause(1800)}
   onPointerCancel={()=>pause(1200)}
   onTouchEnd={()=>pause(1800)}
   onWheel={()=>pause(1400)}
   onFocusCapture={()=>pause(2600)}
   onKeyDown={onKeyDown}
   tabIndex={0}
   aria-label="Styled with AX gallery"
  >
   {loopItems.map((item,index)=>{
    const itemIndex=index%items.length;
    const copy=Math.floor(index/items.length);
    const size=sizePattern[itemIndex%sizePattern.length];
    const media=<>
     <div className="styled-with-ax-media"><ProductImage src={item.src} alt={item.alt || item.title || 'Styled with AX'} sizes="(max-width:700px) 58vw, 25vw"/></div>
     <div className="styled-with-ax-meta"><span>{item.label || 'STYLED WITH AX'}</span>{item.title && <span>{item.title}</span>}</div>
    </>;

    return item.href
     ? <Link className={`styled-with-ax-card styled-size-${size}`} href={item.href} key={`${item.src}-${copy}`} aria-hidden={copy!==1} tabIndex={copy===1?0:-1}>{media}</Link>
     : <article className={`styled-with-ax-card styled-size-${size}`} key={`${item.src}-${copy}`} aria-hidden={copy!==1}>{media}</article>;
   })}
  </div>
 </div>;
}
