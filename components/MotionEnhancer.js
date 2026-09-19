'use client';
import {useEffect} from 'react';

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

function staggerDelay(node){
  if(!node.classList.contains('product-card')) return 0;
  const parent=node.parentElement;
  if(!parent) return 0;
  const cards=[...parent.children].filter(child=>child.classList?.contains('product-card'));
  const index=Math.max(0,cards.indexOf(node));
  return Math.min(index%4,3)*45;
}

export default function MotionEnhancer(){
  useEffect(()=>{
    if(typeof window==='undefined' || typeof IntersectionObserver==='undefined') return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(reduced.matches) return;

    document.documentElement.classList.add('ax-motion-enabled');
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting) continue;
        entry.target.classList.add('ax-motion-visible');
        observer.unobserve(entry.target);
      }
    },{rootMargin:'0px 0px -7% 0px',threshold:.08});

    const prepare=root=>{
      const nodes=[];
      if(root instanceof Element && root.matches(REVEAL_SELECTOR)) nodes.push(root);
      root.querySelectorAll?.(REVEAL_SELECTOR).forEach(node=>nodes.push(node));
      for(const node of nodes){
        if(node.dataset.axMotionReady==='true') continue;
        node.dataset.axMotionReady='true';
        node.setAttribute('data-ax-reveal','');
        node.style.setProperty('--ax-motion-delay',staggerDelay(node)+'ms');
        const rect=node.getBoundingClientRect();
        if(rect.top<window.innerHeight*.86 && rect.bottom>0) node.classList.add('ax-motion-visible');
        else observer.observe(node);
      }
    };

    prepare(document);
    let frame=0;
    const mutationObserver=new MutationObserver(mutations=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        for(const mutation of mutations){
          for(const node of mutation.addedNodes){
            if(node.nodeType===Node.ELEMENT_NODE) prepare(node);
          }
        }
      });
    });
    mutationObserver.observe(document.body,{childList:true,subtree:true});

    return()=>{
      cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      observer.disconnect();
      document.documentElement.classList.remove('ax-motion-enabled');
    };
  },[]);

  return null;
}
