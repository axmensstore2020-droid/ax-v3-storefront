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
  '.account-page section',
  '.pdp-gallery',
  '.pdp-info>.eyebrow',
  '.pdp-info>.pdp-title-row',
  '.pdp-info>.buy-box',
  '.product-data-panel',
  '.pdp-after-product-info',
  '.product-proof'
].join(',');

const ENTRY_SELECTOR=[
  '.filter-panel',
  '.sort-panel',
  '.search-suggestions',
  '.delivery-location-row',
  '.delivery-services-list',
  '.size-recommendation',
  '.cart-line',
  '.cart-quantity-value',
  '.shipping-progress',
  '.cart-recommendation',
  '.cart-total',
  '.checkout-methods',
  '.partial-cod-status',
  '.partial-cod-continue',
  '.empty-cart',
  '.category-menu-item'
].join(',');

function siblingIndex(node,selector){
  const parent=node.parentElement;
  if(!parent) return 0;
  const siblings=[...parent.children].filter(child=>child.matches?.(selector));
  return Math.max(0,siblings.indexOf(node));
}

function revealPreset(node){
  if(node.classList.contains('pdp-gallery')) return {x:-5,y:0,delay:0,transition:AX_MOTION.pdp};
  if(node.classList.contains('pdp-title-row')) return {x:4,y:0,delay:.035,transition:AX_MOTION.pdp};
  if(node.classList.contains('buy-box')) return {x:0,y:7,delay:.055,transition:AX_MOTION.pdp};
  if(node.classList.contains('product-data-panel')) return {x:0,y:5,delay:0,transition:AX_MOTION.pdp};
  if(node.classList.contains('pdp-after-product-info')||node.classList.contains('product-proof')) return {x:0,y:5,delay:.025,transition:AX_MOTION.pdp};
  if(node.matches?.('.pdp-info>.eyebrow')) return {x:2,y:0,delay:.015,transition:AX_MOTION.pdp};

  if(!node.classList.contains('product-card')) return {x:0,y:9,delay:0,transition:AX_MOTION.reveal};
  const parent=node.parentElement;
  if(!parent) return {x:0,y:8,delay:0,transition:AX_MOTION.reveal};
  const cards=[...parent.children].filter(child=>child.classList?.contains('product-card'));
  const index=Math.max(0,cards.indexOf(node));
  const offsets=[
    {x:-3,y:8},
    {x:0,y:6},
    {x:3,y:9},
    {x:-1,y:7}
  ];
  return {...offsets[index%4],delay:Math.min(index%4,3)*0.045,transition:AX_MOTION.reveal};
}

function entryPreset(node){
  if(node.classList.contains('filter-panel')) return {
    from:'translate3d(0px,-4px,0px) scale(1.006)',
    transition:AX_MOTION.panel,
    delay:0
  };
  if(node.classList.contains('sort-panel')) return {
    from:'translate3d(2px,-3px,0px) scale(.997)',
    transition:AX_MOTION.sort,
    delay:0
  };
  if(node.classList.contains('delivery-location-row')) return {
    from:'translate3d(-2px,0px,0px) scale(1)',
    transition:AX_MOTION.service,
    delay:0
  };
  if(node.classList.contains('delivery-services-list')) return {
    from:'translate3d(0px,5px,0px) scale(.999)',
    transition:AX_MOTION.service,
    delay:.035
  };
  if(node.classList.contains('size-recommendation')) return {
    from:'translate3d(0px,3px,0px) scale(1)',
    transition:AX_MOTION.feedback,
    delay:0
  };
  if(node.classList.contains('cart-line')) {
    const index=siblingIndex(node,'.cart-line');
    return {
      from:'translate3d(5px,0px,0px) scale(.998)',
      transition:AX_MOTION.commerce,
      delay:Math.min(index,4)*.035
    };
  }
  if(node.classList.contains('cart-quantity-value')) return {
    from:'translate3d(0px,2px,0px) scale(.94)',
    transition:AX_MOTION.feedback,
    delay:0
  };
  if(node.classList.contains('cart-recommendation')) {
    const index=siblingIndex(node,'.cart-recommendation');
    return {
      from:'translate3d(4px,2px,0px) scale(.998)',
      transition:AX_MOTION.commerce,
      delay:Math.min(index,3)*.03
    };
  }
  if(node.classList.contains('shipping-progress')||node.classList.contains('cart-total')||node.classList.contains('checkout-methods')) return {
    from:'translate3d(0px,3px,0px) scale(1)',
    transition:AX_MOTION.commerce,
    delay:.025
  };
  if(node.classList.contains('partial-cod-status')||node.classList.contains('partial-cod-continue')||node.classList.contains('empty-cart')) return {
    from:'translate3d(0px,3px,0px) scale(.999)',
    transition:AX_MOTION.feedback,
    delay:0
  };
  if(node.classList.contains('category-menu-item')) {
    const index=siblingIndex(node,'.category-menu-item');
    return {
      from:'translate3d(3px,0px,0px) scale(1)',
      transition:AX_MOTION.cascade,
      delay:Math.min(index,7)*.025
    };
  }
  return {
    from:'translate3d(0px,-4px,0px) scale(1)',
    transition:AX_MOTION.search,
    delay:0
  };
}

export default function MotionEnhancer(){
  useEffect(()=>{
    if(typeof window==='undefined' || typeof IntersectionObserver==='undefined') return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(reduced.matches) return;

    document.documentElement.classList.add('ax-motion-enabled');
    const active=new Set(),detailListeners=new Map();

    function track(controls,node=null){
      active.add(controls);
      controls.then?.(()=>{
        active.delete(controls);
        if(node) node.style.willChange='';
      });
      return controls;
    }

    function runReveal(node){
      const {x,y,delay,transition}=revealPreset(node);
      const from=`translate3d(${x}px,${y}px,0px)`;
      node.style.opacity='0';
      node.style.transform=from;
      node.style.willChange='opacity, transform';
      track(animate(
        node,
        {opacity:[0,1],transform:[from,'translate3d(0px,0px,0px)']},
        {...transition,delay}
      ),node);
      node.classList.add('ax-motion-visible');
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
        node.style.willChange='opacity, transform';
        track(animate(
          node,
          {opacity:[0,1],transform:[preset.from,'translate3d(0px,0px,0px) scale(1)']},
          {...preset.transition,delay:preset.delay}
        ),node);
      }
    }

    function detailsTarget(details){
      if(details.classList.contains('product-info-details')) return details.querySelector(':scope > .product-info-content');
      if(details.classList.contains('menu-group')) return details.querySelector(':scope > nav');
      return null;
    }

    function prepareDetails(root){
      const nodes=[];
      if(root instanceof HTMLDetailsElement && (root.classList.contains('product-info-details')||root.classList.contains('menu-group'))) nodes.push(root);
      root.querySelectorAll?.('details.product-info-details,details.menu-group').forEach(node=>nodes.push(node));

      for(const details of nodes){
        if(detailListeners.has(details)) continue;
        const handler=()=>{
          if(!details.open) return;
          const content=detailsTarget(details);
          if(!content) return;
          content.style.willChange='opacity, transform';
          track(animate(
            content,
            {opacity:[0,1],transform:['translate3d(0px,-4px,0px)','translate3d(0px,0px,0px)']},
            AX_MOTION.accordion
          ),content);
        };
        details.addEventListener('toggle',handler);
        detailListeners.set(details,handler);
      }
    }

    prepareReveal(document);
    prepareDetails(document);

    let frame=0;
    const mutationObserver=new MutationObserver(mutations=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        for(const mutation of mutations){
          for(const node of mutation.addedNodes){
            if(node.nodeType!==Node.ELEMENT_NODE) continue;
            prepareReveal(node);
            animateEntries(node);
            prepareDetails(node);
          }
        }
      });
    });
    mutationObserver.observe(document.body,{childList:true,subtree:true});

    return()=>{
      cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      observer.disconnect();
      for(const [details,handler] of detailListeners) details.removeEventListener('toggle',handler);
      detailListeners.clear();
      for(const controls of active) controls.stop?.();
      active.clear();
      document.documentElement.classList.remove('ax-motion-enabled');
    };
  },[]);

  return null;
}
