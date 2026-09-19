'use client';
import {useEffect} from 'react';
import {animate} from 'motion';
import {AX_MOTION} from '../lib/motion';

const REVEAL_SELECTOR=[
  '.editorial-welcome',
  '.editorial-campaign',
  '.editorial-split-campaign',
  '.editorial-feature',
  '.editorial-special',
  '.editorial-style-index',
  '.editorial-close',
  '.product-card',
  '.complete-look',
  '.related-section',
  '.store-card',
  '.account-page section'
].join(',');

const ENTRY_SELECTOR='.filter-panel,.sort-panel,.search-suggestions';

function revealPreset(node){
  if(!node.classList.contains('product-card')) return {x:0,y:9,delay:0};
  const parent=node.parentElement;
  if(!parent) return {x:0,y:8,delay:0};
  const cards=[...parent.children].filter(child=>child.classList?.contains('product-card'));
  const index=Math.max(0,cards.indexOf(node));
  const offsets=[
    {x:-3,y:8},
    {x:0,y:6},
    {x:3,y:9},
    {x:-1,y:7}
  ];
  return {...offsets[index%4],delay:Math.min(index%4,3)*0.045};
}

function entryPreset(node){
  if(node.classList.contains('filter-panel')) {
    return {
      from:'translate3d(0px,-4px,0px) scale(1.006)',
      duration:AX_MOTION.panel.duration
    };
  }
  if(node.classList.contains('sort-panel')) {
    return {
      from:'translate3d(2px,-3px,0px) scale(.997)',
      duration:AX_MOTION.sort.duration
    };
  }
  return {
    from:'translate3d(0px,-4px,0px) scale(1)',
    duration:AX_MOTION.search.duration
  };
}

export default function MotionEnhancer(){
  useEffect(()=>{
    if(typeof window==='undefined' || typeof IntersectionObserver==='undefined') return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(reduced.matches) return;

    document.documentElement.classList.add('ax-motion-enabled');
    const active=new Set();

    function runReveal(node){
      const {x,y,delay}=revealPreset(node);
      const from=`translate3d(${x}px,${y}px,0px)`;
      node.style.opacity='0';
      node.style.transform=from;
      node.style.willChange='opacity, transform';
      const controls=animate(
        node,
        {opacity:[0,1],transform:[from,'translate3d(0px,0px,0px)']},
        {...AX_MOTION.reveal,delay}
      );
      active.add(controls);
      controls.then?.(()=>{
        active.delete(controls);
        node.style.willChange='';
        node.classList.add('ax-motion-visible');
      });
    }

    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        runReveal(entry.target);
      }
    },{rootMargin:'0px 0px -7% 0px',threshold:.08});

    function prepareReveal(root){
      const nodes=[];
      if(root instanceof Element && root.matches(REVEAL_SELECTOR)) nodes.push(root);
      root.querySelectorAll?.(REVEAL_SELECTOR).forEach(node=>nodes.push(node));

      for(const node of nodes){
        if(node.dataset.axMotionReady==='true') continue;
        node.dataset.axMotionReady='true';
        node.setAttribute('data-ax-reveal','');

        const rect=node.getBoundingClientRect();
        if(rect.top<window.innerHeight*.86 && rect.bottom>0) runReveal(node);
        else {
          const {x,y}=revealPreset(node);
          node.style.opacity='0';
          node.style.transform=`translate3d(${x}px,${y}px,0px)`;
          observer.observe(node);
        }
      }
    }

    function animateEntries(root){
      const nodes=[];
      if(root instanceof Element && root.matches(ENTRY_SELECTOR)) nodes.push(root);
      root.querySelectorAll?.(ENTRY_SELECTOR).forEach(node=>nodes.push(node));

      for(const node of nodes){
        if(node.dataset.axEntryMotionReady==='true') continue;
        node.dataset.axEntryMotionReady='true';
        const preset=entryPreset(node);
        const controls=animate(
          node,
          {opacity:[0,1],transform:[preset.from,'translate3d(0px,0px,0px) scale(1)']},
          {duration:preset.duration,ease:AX_MOTION.panel.ease}
        );
        active.add(controls);
        controls.then?.(()=>active.delete(controls));
      }
    }

    prepareReveal(document);
    let frame=0;
    const mutationObserver=new MutationObserver(mutations=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        for(const mutation of mutations){
          for(const node of mutation.addedNodes){
            if(node.nodeType!==Node.ELEMENT_NODE) continue;
            prepareReveal(node);
            animateEntries(node);
          }
        }
      });
    });
    mutationObserver.observe(document.body,{childList:true,subtree:true});

    return()=>{
      cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      observer.disconnect();
      for(const controls of active) controls.stop?.();
      active.clear();
      document.documentElement.classList.remove('ax-motion-enabled');
    };
  },[]);

  return null;
}
