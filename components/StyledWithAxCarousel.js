'use client';

import {useEffect,useRef} from 'react';
import Link from 'next/link';
import ProductImage from './ProductImage';

const sizePattern=['wide','small','long','big','medium','wide','small','long','big','medium'];

export default function StyledWithAxCarousel({items=[]}) {
 const railRef=useRef(null);
 const interactedRef=useRef(false);

 useEffect(()=>{
  if(typeof window==='undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rail=railRef.current;
  if(!rail || rail.scrollWidth<=rail.clientWidth) return;
  const timer=window.setInterval(()=>{
   if(interactedRef.current || document.hidden) return;
   const max=rail.scrollWidth-rail.clientWidth;
   const next=rail.scrollLeft+Math.max(260,rail.clientWidth*.68);
   rail.scrollTo({left:next>=max-20?0:next,behavior:'smooth'});
  },4800);
  return ()=>window.clearInterval(timer);
 },[]);

 function move(direction){
  const rail=railRef.current;
  if(!rail) return;
  interactedRef.current=true;
  rail.scrollBy({left:direction*Math.max(260,rail.clientWidth*.72),behavior:'smooth'});
 }

 return <div className="styled-with-ax-carousel">
  <div
   ref={railRef}
   className="styled-with-ax-rail"
   onPointerDown={()=>{interactedRef.current=true;}}
   onFocusCapture={()=>{interactedRef.current=true;}}
   aria-label="Styled with AX gallery"
  >
   {items.map((item,index)=>{
    const size=sizePattern[index%sizePattern.length];
    const media=<>
     <div className="styled-with-ax-media"><ProductImage src={item.src} alt={item.alt || item.title || 'Styled with AX'} sizes="(max-width:700px) 72vw, 36vw"/></div>
     <div className="styled-with-ax-meta"><span>{item.label || 'STYLED WITH AX'}</span>{item.title && <span>{item.title}</span>}</div>
    </>;
    return item.href
     ? <Link className={`styled-with-ax-card styled-size-${size}`} href={item.href} key={item.src}>{media}</Link>
     : <article className={`styled-with-ax-card styled-size-${size}`} key={item.src}>{media}</article>;
   })}
  </div>
  <div className="styled-with-ax-controls" aria-label="Gallery controls">
   <button type="button" onClick={()=>move(-1)} aria-label="Previous images">←</button>
   <button type="button" onClick={()=>move(1)} aria-label="Next images">→</button>
  </div>
 </div>;
}
