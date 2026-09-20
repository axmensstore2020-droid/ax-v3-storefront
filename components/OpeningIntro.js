'use client';

import {useEffect,useRef} from 'react';
import {animate} from 'motion';
import {AX_MOTION} from '../lib/motion';

const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

export default function OpeningIntro(){
  const rootRef=useRef(null),curtainRef=useRef(null),logoRef=useRef(null);

  useEffect(()=>{
    const root=document.documentElement;
    if(root.dataset.axIntro!=='play') return;

    const overlay=rootRef.current,curtain=curtainRef.current,logo=logoRef.current;
    const target=document.querySelector('.header .brand .brand-mark');
    if(!overlay || !curtain || !logo || !target){
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

    const clearTransientStyles=()=>{
      logo.style.willChange='';
      logo.style.opacity='';
      logo.style.transform='';
      curtain.style.willChange='';
      curtain.style.opacity='';
    };

    const finish=()=>{
      if(skipped) return;
      skipped=true;
      for(const control of active) control.stop?.();
      active.clear();
      root.dataset.axIntro='skip';
      clearTransientStyles();
    };

    const onPointerDown=()=>finish();
    const onKeyDown=event=>{
      if(event.key==='Escape' || event.key==='Enter' || event.key===' ') finish();
    };

    overlay.addEventListener('pointerdown',onPointerDown,{passive:true});
    window.addEventListener('keydown',onKeyDown);

    async function run(){
      await nextFrame();
      if(disposed || skipped) return;

      const from=logo.getBoundingClientRect(),to=target.getBoundingClientRect();
      if(!from.width || !from.height || !to.width || !to.height){
        finish();
        return;
      }

      const dx=(to.left+to.width/2)-(from.left+from.width/2);
      const dy=(to.top+to.height/2)-(from.top+from.height/2);
      const scale=Math.min(to.width/from.width,to.height/from.height);
      const compact=window.matchMedia('(max-width: 700px)').matches;
      const intro=compact?AX_MOTION.introCompact:AX_MOTION.intro;

      logo.style.willChange='transform, opacity';
      curtain.style.willChange='opacity';

      const arrive=track(animate(
        logo,
        {opacity:[1,1],transform:['translate3d(0,0,0) scale(1.035)','translate3d(0,0,0) scale(1)']},
        compact?AX_MOTION.introRevealCompact:AX_MOTION.introReveal
      ));
      await arrive;
      if(disposed || skipped) return;

      const dock=track(animate(
        logo,
        {
          transform:[
            'translate3d(0,0,0) scale(1)',
            `translate3d(${dx}px,${dy}px,0) scale(${scale})`
          ]
        },
        intro
      ));
      const reveal=track(animate(
        curtain,
        {opacity:[1,1,.70,0]},
        {...intro,delay:.025}
      ));
      await Promise.all([dock,reveal]);
      if(disposed || skipped) return;

      root.dataset.axIntro='handoff';
      const handoff=track(animate(logo,{opacity:[1,0]},{duration:.08,ease:'linear'}));
      await handoff;
      if(disposed || skipped) return;

      root.dataset.axIntro='skip';
      clearTransientStyles();
    }

    run().catch(()=>finish());

    return()=>{
      disposed=true;
      overlay.removeEventListener('pointerdown',onPointerDown);
      window.removeEventListener('keydown',onKeyDown);
      for(const control of active) control.stop?.();
      active.clear();
      if(root.dataset.axIntro!=='skip') root.dataset.axIntro='skip';
      clearTransientStyles();
    };
  },[]);

  return <div ref={rootRef} className="ax-opening-intro" aria-hidden="true">
    <div ref={curtainRef} className="ax-opening-curtain"/>
    <div className="ax-opening-logo-anchor">
      <img ref={logoRef} className="ax-opening-logo" src="/ax-logo-160.webp" alt="" width="320" height="186" decoding="sync" fetchPriority="high" draggable="false"/>
    </div>
  </div>;
}
