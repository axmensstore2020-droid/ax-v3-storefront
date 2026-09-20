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

    let disposed=false;
    const active=[];

    async function run(){
      await nextFrame();
      if(disposed) return;

      const from=logo.getBoundingClientRect(),to=target.getBoundingClientRect();
      if(!from.width || !from.height || !to.width || !to.height){
        root.dataset.axIntro='skip';
        return;
      }

      const dx=(to.left+to.width/2)-(from.left+from.width/2);
      const dy=(to.top+to.height/2)-(from.top+from.height/2);
      const scale=Math.min(to.width/from.width,to.height/from.height);

      logo.style.willChange='transform, opacity';
      curtain.style.willChange='opacity';

      const arrive=animate(
        logo,
        {opacity:[0,1],transform:['translate3d(0,0,0) scale(1.055)','translate3d(0,0,0) scale(1)']},
        AX_MOTION.introReveal
      );
      active.push(arrive);
      await arrive;
      if(disposed) return;

      const dock=animate(
        logo,
        {
          transform:[
            'translate3d(0,0,0) scale(1)',
            `translate3d(${dx}px,${dy}px,0) scale(${scale})`
          ]
        },
        AX_MOTION.intro
      );
      const reveal=animate(
        curtain,
        {opacity:[1,1,.72,0]},
        {...AX_MOTION.intro,delay:.04}
      );
      active.push(dock,reveal);
      await Promise.all([dock,reveal]);
      if(disposed) return;

      const handoff=animate(logo,{opacity:[1,0]},{duration:.08,ease:'linear'});
      active.push(handoff);
      await handoff;
      if(disposed) return;

      root.dataset.axIntro='skip';
      logo.style.willChange='';
      curtain.style.willChange='';
    }

    run().catch(()=>{root.dataset.axIntro='skip';});

    return()=>{
      disposed=true;
      active.forEach(control=>control.stop?.());
      if(root.dataset.axIntro==='play') root.dataset.axIntro='skip';
    };
  },[]);

  return <div ref={rootRef} className="ax-opening-intro" aria-hidden="true">
    <div ref={curtainRef} className="ax-opening-curtain"/>
    <div className="ax-opening-logo-anchor">
      <img ref={logoRef} className="ax-opening-logo" src="/ax-logo-160.webp" alt="" width="320" height="186" decoding="sync" fetchPriority="high"/>
    </div>
  </div>;
}
