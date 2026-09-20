'use client';

import {useEffect,useRef} from 'react';
import {animate} from 'motion';
import {AX_MOTION} from '../lib/motion';

const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export default function OpeningIntro(){
  const blockerRef=useRef(null);

  useEffect(()=>{
    const root=document.documentElement;
    if(root.dataset.axIntro!=='play') return;

    const blocker=blockerRef.current;
    const shell=document.querySelector('.ax-site-shell');
    const mark=document.querySelector('.header .brand .brand-mark');
    if(!blocker || !shell || !mark){
      root.dataset.axIntro='skip';
      return;
    }

    let disposed=false,skipped=false;
    const active=new Set();
    const compact=window.matchMedia('(max-width: 700px)').matches;
    const zoom=compact?3.6:3.4;
    const timing=compact?AX_MOTION.introCompact:AX_MOTION.intro;

    const track=control=>{
      active.add(control);
      control.then?.(()=>active.delete(control));
      return control;
    };

    const clear=()=>{
      shell.style.willChange='';
      shell.style.transform='';
      shell.style.transformOrigin='';
      shell.style.filter='';
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

      // Measure the unscaled header position synchronously, then restore the opening zoom
      // before the browser gets a chance to paint a normal-scale frame.
      shell.style.transform='none';
      const markRect=mark.getBoundingClientRect();
      if(!markRect.width || !markRect.height){
        finish();
        return;
      }

      const originX=markRect.left+2;
      const originY=markRect.top+2;
      shell.style.transformOrigin=`${originX}px ${originY}px`;
      shell.style.willChange='transform';
      shell.style.transform=`translate3d(0,0,0) scale(${zoom})`;

      await wait(compact?220:280);
      if(disposed || skipped) return;

      const zoomOut=track(animate(
        shell,
        {
          transform:[
            `translate3d(0,0,0) scale(${zoom})`,
            `translate3d(0,0,0) scale(${zoom*.985})`,
            'translate3d(0,0,0) scale(1)'
          ]
        },
        {...timing,times:[0,.12,1]}
      ));

      await zoomOut;
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

  return <div ref={blockerRef} className="ax-opening-intro" aria-hidden="true"/>;
}
