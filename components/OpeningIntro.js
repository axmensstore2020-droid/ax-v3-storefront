'use client';

import {useEffect,useRef} from 'react';
import {animate} from 'motion';
import Brand from './Brand';

const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export default function OpeningIntro(){
  const blockerRef=useRef(null);

  useEffect(()=>{
    const root=document.documentElement;
    if(root.dataset.axIntro!=='play') return;

    const blocker=blockerRef.current;
    if(!blocker){
      root.dataset.axIntro='skip';
      return;
    }

    let disposed=false,skipped=false;
    const active=new Set();

    const track=control=>{
      active.add(control);
      control.then?.(()=>active.delete(control));
      return control;
    };

    const clear=()=>{
      blocker.style.opacity='';
    };

    const finish=()=>{
      if(skipped) return;
      skipped=true;
      for(const control of active) control.stop?.();
      active.clear();
      root.dataset.axIntro='skip';
      clear();
    };

    const onPointerDown=()=>finish();
    const onKeyDown=event=>{
      if(event.key==='Escape' || event.key==='Enter' || event.key===' ') finish();
    };

    blocker.addEventListener('pointerdown',onPointerDown,{passive:true});
    window.addEventListener('keydown',onKeyDown);

    async function run(){
      await nextFrame();
      if(disposed || skipped) return;

      await wait(1950);
      if(disposed || skipped) return;

      const fade=track(animate(blocker,{opacity:[1,0]},{duration:.46,ease:[.22,.68,.2,1]}));

      await fade;
      if(disposed || skipped) return;

      root.dataset.axIntro='skip';
      clear();
    }

    run().catch(()=>finish());

    return()=>{
      disposed=true;
      blocker.removeEventListener('pointerdown',onPointerDown);
      window.removeEventListener('keydown',onKeyDown);
      for(const control of active) control.stop?.();
      active.clear();
      if(root.dataset.axIntro!=='skip') root.dataset.axIntro='skip';
      clear();
    };
  },[]);

  return <div ref={blockerRef} className="ax-opening-intro" aria-hidden="true">
    <div className="ax-opening-stage">
      <Brand/>
      <svg className="ax-opening-route" viewBox="0 0 400 150" role="presentation">
        <path className="ax-opening-trail" pathLength="1" d="M18 84 C66 84 63 35 116 35 S173 111 225 111 S286 38 382 44"/>
        <g className="ax-opening-runner">
          <circle cx="0" cy="0" r="11"/>
          <g className="ax-opening-runner-logo">
            <image href="/ax-logo-160.webp" x="-7" y="-4.1" width="14" height="8.2" preserveAspectRatio="xMidYMid meet"/>
            <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="1.95s" fill="freeze"/>
          </g>
          <animateMotion dur="1.95s" path="M18 84 C66 84 63 35 116 35 S173 111 225 111 S286 38 382 44" rotate="auto" fill="freeze"/>
        </g>
      </svg>
    </div>
  </div>;
}
