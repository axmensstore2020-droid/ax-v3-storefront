'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import Brand from './Brand';
import Icon from './Icon';
import Dialog from './Dialog';
import {useStylist} from './StylistProvider';

const POSITION_KEY='ax:island-position:v1';
const HOLD_MS=240;
const EDGE_GAP=14;
const EXPANDED_HEIGHT=342;

function clamp(value,min,max){
 return Math.min(Math.max(value,min),max);
}

function setDragVars(node,{x,y}){
 node?.style.setProperty('--ax-drag-x',`${x}px`);
 node?.style.setProperty('--ax-drag-y',`${y}px`);
}

function safeDesktopPosition(node,position){
 if(!node || typeof window==='undefined') return position;
 const style=window.getComputedStyle(node);
 const baseLeft=Number.parseFloat(style.left)||0;
 const width=node.offsetWidth||72;
 const maxX=Math.max(EDGE_GAP-baseLeft,window.innerWidth-EDGE_GAP-width-baseLeft);
 const minX=EDGE_GAP-baseLeft;

 const halfExpanded=EXPANDED_HEIGHT/2;
 const baseCenterY=window.innerHeight/2;
 let minY=EDGE_GAP+halfExpanded-baseCenterY;
 let maxY=window.innerHeight-EDGE_GAP-halfExpanded-baseCenterY;
 if(minY>maxY) minY=maxY=0;

 return {
  x:clamp(Number.isFinite(position.x)?position.x:0,minX,maxX),
  y:clamp(Number.isFinite(position.y)?position.y:0,minY,maxY)
 };
}

export default function AXIsland({accountUrl,accountEnabled=false}) {
 const path=usePathname(),[profile,setProfile]=useState(false),[accountState,setAccountState]=useState(accountEnabled?'unknown':'disabled'),{openStylist}=useStylist();
 const islandRef=useRef(null);
 const holdTimerRef=useRef(0);
 const suppressClickRef=useRef(false);
 const positionRef=useRef({x:0,y:0});
 const pointerRef=useRef(null);
 const productMatch=path.match(/^\/products\/([^/]+)\/?$/),currentProduct=productMatch?{handle:productMatch[1]}:null;

 useEffect(()=>{
  const island=islandRef.current;
  if(!island || typeof window==='undefined') return;
  const media=window.matchMedia('(min-width:1100px)');

  function persist(position){
   try { window.localStorage.setItem(POSITION_KEY,JSON.stringify(position)); } catch {}
  }

  function restore(){
   if(!media.matches){
    setDragVars(island,{x:0,y:0});
    return;
   }
   let saved={x:0,y:0};
   try {
    const parsed=JSON.parse(window.localStorage.getItem(POSITION_KEY)||'null');
    if(parsed && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) saved=parsed;
   } catch {}
   const safe=safeDesktopPosition(island,saved);
   positionRef.current=safe;
   setDragVars(island,safe);
   if(safe.x!==saved.x || safe.y!==saved.y) persist(safe);
  }

  function keepVisible(){
   if(!media.matches) return;
   const safe=safeDesktopPosition(island,positionRef.current);
   positionRef.current=safe;
   setDragVars(island,safe);
   persist(safe);
  }

  restore();
  media.addEventListener?.('change',restore);
  window.addEventListener('resize',keepVisible);
  return()=>{
   media.removeEventListener?.('change',restore);
   window.removeEventListener('resize',keepVisible);
   window.clearTimeout(holdTimerRef.current);
   document.documentElement.classList.remove('ax-island-dragging');
  };
 },[]);

 function beginHold(event){
  if(typeof window==='undefined' || !window.matchMedia('(min-width:1100px)').matches || event.button!==0) return;
  window.clearTimeout(holdTimerRef.current);
  event.currentTarget.setPointerCapture?.(event.pointerId);
  pointerRef.current={
   pointerId:event.pointerId,
   startClientX:event.clientX,
   startClientY:event.clientY,
   startX:positionRef.current.x,
   startY:positionRef.current.y,
   dragging:false
  };
  holdTimerRef.current=window.setTimeout(()=>{
   if(!pointerRef.current || pointerRef.current.pointerId!==event.pointerId) return;
   pointerRef.current.dragging=true;
   islandRef.current?.classList.add('is-dragging');
   document.documentElement.classList.add('ax-island-dragging');
  },HOLD_MS);
 }

 function moveHeld(event){
  const pointer=pointerRef.current;
  const island=islandRef.current;
  if(!pointer || pointer.pointerId!==event.pointerId || !pointer.dragging || !island) return;
  event.preventDefault();
  const next=safeDesktopPosition(island,{
   x:pointer.startX+(event.clientX-pointer.startClientX),
   y:pointer.startY+(event.clientY-pointer.startClientY)
  });
  positionRef.current=next;
  setDragVars(island,next);
 }

 function endHold(event){
  const pointer=pointerRef.current;
  if(!pointer || pointer.pointerId!==event.pointerId) return;
  window.clearTimeout(holdTimerRef.current);
  event.currentTarget.releasePointerCapture?.(event.pointerId);
  if(pointer.dragging){
   suppressClickRef.current=true;
   try { window.localStorage.setItem(POSITION_KEY,JSON.stringify(positionRef.current)); } catch {}
   islandRef.current?.classList.remove('is-dragging');
   document.documentElement.classList.remove('ax-island-dragging');
   window.setTimeout(()=>{suppressClickRef.current=false;},80);
  }
  pointerRef.current=null;
 }

 function cancelHold(event){
  const pointer=pointerRef.current;
  if(!pointer || pointer.pointerId!==event.pointerId) return;
  window.clearTimeout(holdTimerRef.current);
  islandRef.current?.classList.remove('is-dragging');
  document.documentElement.classList.remove('ax-island-dragging');
  pointerRef.current=null;
 }

 function activateStylist(event){
  if(suppressClickRef.current){
   event.preventDefault();
   event.stopPropagation();
   suppressClickRef.current=false;
   return;
  }
  openStylist('style',currentProduct);
 }

 async function openProfile() {
  setProfile(true);
  if(!accountEnabled) return;
  setAccountState('loading');
  try {
   const response=await fetch('/account/status',{cache:'no-store',credentials:'same-origin'});
   const data=response.ok ? await response.json() : null;
   setAccountState(data?.signedIn?'signed-in':'signed-out');
  } catch { setAccountState('unknown'); }
 }

 const signedIn=accountState==='signed-in',checking=accountState==='loading';
 const primaryHref=accountEnabled && accountState==='signed-out'?'/account/login?returnTo=%2Faccount':accountUrl;
 const primaryLabel=signedIn?'VIEW AX ACCOUNT':accountEnabled && accountState==='signed-out'?'SIGN IN / CREATE ACCOUNT':accountEnabled?'OPEN AX ACCOUNT':'OPEN MY ACCOUNT';

 return <><nav ref={islandRef} id="ax-island-navigation" className="ax-island" aria-label="AX navigation">
  <svg className="island-surface" viewBox="0 0 420 94" preserveAspectRatio="none" aria-hidden="true"><path d="M36 24H157C176 24 180 3 210 3S244 24 263 24H384A33 33 0 0 1 417 57V58A33 33 0 0 1 384 91H36A33 33 0 0 1 3 58V57A33 33 0 0 1 36 24Z"/></svg>
  <Link href="/" className="island-item island-home" aria-current={path === '/' ? 'page' : undefined}><Icon name="home"/><span>Home</span></Link>
  <Link href="/products" className="island-item island-explore" aria-current={path.startsWith('/products') || path.startsWith('/collections') ? 'page' : undefined}><Icon name="explore"/><span>Explore</span></Link>
  <button
   className="island-stylist"
   onClick={activateStylist}
   onPointerDown={beginHold}
   onPointerMove={moveHeld}
   onPointerUp={endHold}
   onPointerCancel={cancelHold}
   aria-label="Open AX Stylist. Press and hold to move."
  >
   <span className="ax-marble-field" aria-hidden="true"><i/><i/><i/></span>
   <span className="ax-orb"><Brand inverse/></span>
   <span className="island-stylist-label">Stylist</span>
  </button>
  <Link href="/products?search=1" className="island-item island-search"><Icon name="search"/><span>Search</span></Link>
  <button className="island-item island-profile" onClick={openProfile}><Icon name="profile"/><span>Profile</span></button>
 </nav>
 {profile && <Dialog title="Your AX" className="stylist-dialog" onClose={() => setProfile(false)}><h3 className="editorial sheet-title">Make yourself at home.</h3><p>{!accountEnabled?'Access your orders through your store account.':checking?'Checking your AX account…':signedIn?'Your AX account is connected. Orders, tracking and saved details are ready here.':accountState==='signed-out'?'Sign in or create an account to keep orders and account details within AX.':'Open your AX account to continue.'}</p>{primaryHref && !checking ? <a className="solid-button" href={primaryHref}>{primaryLabel} <Icon name="arrow"/></a> : checking ? <p className="small muted">Checking sign-in status…</p> : <p className="muted">Account sign-in will be available when the store opens.</p>}{signedIn && <form action="/account/logout" method="post"><button className="underlined-link" type="submit">SIGN OUT <span aria-hidden="true">→</span></button></form>}<p className="small muted">Manage optional measurements and preferences in AX Stylist → My fit & style.</p></Dialog>}</>;
}
