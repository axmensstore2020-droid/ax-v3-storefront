'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {animate} from 'motion';
import Brand from './Brand';
import Icon from './Icon';
import Dialog from './Dialog';
import {useStylist} from './StylistProvider';
import {AX_ISLAND_SLOT_COUNT,islandSlotX,nearestIslandIndex} from '../lib/island-navigation.js';

const BEAD_WIDTH=76;
const SLOT_ICONS=['home','explore',null,'search','profile'];

function reducedMotion(){
 return typeof window!=='undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function renderedX(node,fallback=0){
 if(!node || typeof window==='undefined') return fallback;
 try{
  const matrix=new DOMMatrixReadOnly(window.getComputedStyle(node).transform);
  return Number.isFinite(matrix.m41)?matrix.m41:fallback;
 }catch{return fallback;}
}

export default function AXIsland({accountUrl,accountEnabled=false}) {
 const path=usePathname(),router=useRouter();
 const [profile,setProfile]=useState(false);
 const [accountState,setAccountState]=useState(accountEnabled?'unknown':'disabled');
 const [searchActive,setSearchActive]=useState(false);
 const [visualIndex,setVisualIndex]=useState(0);
 const {openStylist,stylistOpen=false}=useStylist();

 const islandRef=useRef(null),beadRef=useRef(null),animationRef=useRef(null),pointerRef=useRef(null);
 const beadXRef=useRef(0),visualIndexRef=useRef(0),initialSnapRef=useRef(true),suppressClickRef=useRef(false);
 const productMatch=path.match(/^\/products\/([^/]+)\/?$/),currentProduct=productMatch?{handle:productMatch[1]}:null;

 const pageIndex=path==='/'?0:path.startsWith('/products')||path.startsWith('/collections')?1:path.startsWith('/account')?4:0;
 const activeIndex=profile?4:stylistOpen?2:searchActive?3:pageIndex;
 visualIndexRef.current=visualIndex;

 function targetX(index){
  return islandSlotX(islandRef.current?.clientWidth||0,index,BEAD_WIDTH,AX_ISLAND_SLOT_COUNT);
 }
 function setBeadX(value){
  const bead=beadRef.current;
  if(!bead)return;
  animationRef.current?.stop?.();
  bead.style.transform=`translateX(${value}px)`;
  beadXRef.current=value;
 }
 function snapBead(index,{immediate=false}={}){
  const bead=beadRef.current,island=islandRef.current;
  if(!bead || !island)return;
  const target=targetX(index);
  animationRef.current?.stop?.();
  if(immediate || reducedMotion()){
   bead.style.transform=`translateX(${target}px)`;
   beadXRef.current=target;
   return;
  }
  const from=renderedX(bead,beadXRef.current);
  beadXRef.current=from;
  const controls=animate(bead,{x:target},{type:'spring',stiffness:520,damping:34,mass:.62,velocity:0});
  animationRef.current=controls;
  controls.then?.(()=>{
   if(animationRef.current===controls) animationRef.current=null;
   beadXRef.current=target;
  });
 }
 function previewIndex(index){
  setVisualIndex(index);
  if(index!==3)setSearchActive(false);
  requestAnimationFrame(()=>snapBead(index));
 }
 function commitIndex(index){
  previewIndex(index);
  if(index===0){router.push('/');return;}
  if(index===1){router.push('/products');return;}
  if(index===2){openStylist('style',currentProduct);return;}
  if(index===3){setSearchActive(true);router.push('/products?search=1');return;}
  openProfile();
 }

 useEffect(()=>{
  if(typeof window==='undefined')return;
  const params=new URLSearchParams(window.location.search);
  setSearchActive(path.startsWith('/products') && params.get('search')==='1');
 },[path]);

 useEffect(()=>{
  setVisualIndex(activeIndex);
  const frame=requestAnimationFrame(()=>{
   snapBead(activeIndex,{immediate:initialSnapRef.current});
   initialSnapRef.current=false;
  });
  return()=>cancelAnimationFrame(frame);
 },[activeIndex]);

 useEffect(()=>{
  const island=islandRef.current;
  if(!island || typeof ResizeObserver==='undefined')return;
  const observer=new ResizeObserver(()=>{
   requestAnimationFrame(()=>snapBead(visualIndexRef.current,{immediate:true}));
  });
  observer.observe(island);
  return()=>{
   observer.disconnect();
   animationRef.current?.stop?.();
  };
 },[]);

 function beginBeadDrag(event){
  if(event.button!==0)return;
  animationRef.current?.stop?.();
  const bead=beadRef.current;
  if(!bead)return;
  event.currentTarget.setPointerCapture?.(event.pointerId);
  const startX=renderedX(bead,beadXRef.current);
  beadXRef.current=startX;
  pointerRef.current={pointerId:event.pointerId,startClientX:event.clientX,startX,moved:false};
 }
 function moveBead(event){
  const pointer=pointerRef.current,island=islandRef.current;
  if(!pointer || pointer.pointerId!==event.pointerId || !island)return;
  const dx=event.clientX-pointer.startClientX;
  if(!pointer.moved && Math.abs(dx)>4){
   pointer.moved=true;
   island.classList.add('is-bead-dragging');
  }
  if(!pointer.moved)return;
  event.preventDefault();
  const min=targetX(0),max=targetX(AX_ISLAND_SLOT_COUNT-1);
  const x=Math.min(max,Math.max(min,pointer.startX+dx));
  setBeadX(x);
  const nearest=nearestIslandIndex(island.clientWidth,x,BEAD_WIDTH,AX_ISLAND_SLOT_COUNT);
  if(nearest!==visualIndexRef.current){
   visualIndexRef.current=nearest;
   setVisualIndex(nearest);
  }
 }
 function endBeadDrag(event){
  const pointer=pointerRef.current;
  if(!pointer || pointer.pointerId!==event.pointerId)return;
  event.currentTarget.releasePointerCapture?.(event.pointerId);
  pointerRef.current=null;
  islandRef.current?.classList.remove('is-bead-dragging');
  if(!pointer.moved)return;
  const index=nearestIslandIndex(islandRef.current?.clientWidth||0,renderedX(beadRef.current,beadXRef.current),BEAD_WIDTH,AX_ISLAND_SLOT_COUNT);
  suppressClickRef.current=true;
  commitIndex(index);
  window.setTimeout(()=>{suppressClickRef.current=false;},90);
 }
 function cancelBeadDrag(event){
  const pointer=pointerRef.current;
  if(!pointer || pointer.pointerId!==event.pointerId)return;
  pointerRef.current=null;
  islandRef.current?.classList.remove('is-bead-dragging');
  setVisualIndex(activeIndex);
  snapBead(activeIndex);
 }
 function activateBead(event){
  if(suppressClickRef.current){
   event.preventDefault();
   suppressClickRef.current=false;
   return;
  }
  commitIndex(visualIndexRef.current);
 }

 async function openProfile(){
  setProfile(true);
  setSearchActive(false);
  if(!accountEnabled)return;
  setAccountState('loading');
  try{
   const response=await fetch('/account/status',{cache:'no-store',credentials:'same-origin'});
   const data=response.ok?await response.json():null;
   setAccountState(data?.signedIn?'signed-in':'signed-out');
  }catch{setAccountState('unknown');}
 }

 const signedIn=accountState==='signed-in',checking=accountState==='loading';
 const primaryHref=accountEnabled&&accountState==='signed-out'?'/account/login?returnTo=%2Faccount':accountUrl;
 const primaryLabel=signedIn?'VIEW AX ACCOUNT':accountEnabled&&accountState==='signed-out'?'SIGN IN / CREATE ACCOUNT':accountEnabled?'OPEN AX ACCOUNT':'OPEN MY ACCOUNT';
 const beadIcon=SLOT_ICONS[visualIndex];

 return <><nav ref={islandRef} id="ax-island-navigation" className="ax-island ax-liquid-island" aria-label="AX navigation">
  <svg className="ax-island-filter-defs" width="0" height="0" aria-hidden="true" focusable="false">
   <defs>
    <filter id="ax-island-refraction" x="-20%" y="-40%" width="140%" height="180%" colorInterpolationFilters="sRGB">
     <feTurbulence type="fractalNoise" baseFrequency="0.018 0.11" numOctaves="2" seed="11" result="noise"/>
     <feGaussianBlur in="noise" stdDeviation=".35" result="softNoise"/>
     <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="11" xChannelSelector="R" yChannelSelector="B"/>
    </filter>
   </defs>
  </svg>
  <span className="ax-island-glass" aria-hidden="true"><span className="ax-island-refraction"/></span>

  <Link href="/" className={`ax-island-slot island-home${visualIndex===0?' is-active':''}`} aria-current={path==='/'?'page':undefined} onClick={()=>previewIndex(0)}>
   <span className="ax-island-slot-icon" aria-hidden="true"><Icon name="home"/></span><span className="ax-island-slot-label">Home</span>
  </Link>
  <Link href="/products" className={`ax-island-slot island-explore${visualIndex===1?' is-active':''}`} aria-current={!searchActive&&(path.startsWith('/products')||path.startsWith('/collections'))?'page':undefined} onClick={()=>previewIndex(1)}>
   <span className="ax-island-slot-icon" aria-hidden="true"><Icon name="explore"/></span><span className="ax-island-slot-label">Explore</span>
  </Link>
  <button className={`ax-island-slot island-stylist${visualIndex===2?' is-active':''}`} type="button" onClick={()=>{previewIndex(2);openStylist('style',currentProduct);}} aria-pressed={stylistOpen} aria-label="Open AX Stylist">
   <span className="ax-island-slot-icon ax-island-slot-brand" aria-hidden="true"><Brand/></span><span className="ax-island-slot-label">AX</span>
  </button>
  <Link href="/products?search=1" className={`ax-island-slot island-search${visualIndex===3?' is-active':''}`} aria-current={searchActive?'page':undefined} onClick={()=>{setSearchActive(true);previewIndex(3);}}>
   <span className="ax-island-slot-icon" aria-hidden="true"><Icon name="search"/></span><span className="ax-island-slot-label">Search</span>
  </Link>
  <button className={`ax-island-slot island-profile${visualIndex===4?' is-active':''}`} type="button" onClick={()=>{previewIndex(4);openProfile();}} aria-expanded={profile}>
   <span className="ax-island-slot-icon" aria-hidden="true"><Icon name="profile"/></span><span className="ax-island-slot-label">Profile</span>
  </button>

  <span
   ref={beadRef}
   className={`ax-island-bead${visualIndex===2?' is-ax':''}`}
   onClick={activateBead}
   onPointerDown={beginBeadDrag}
   onPointerMove={moveBead}
   onPointerUp={endBeadDrag}
   onPointerCancel={cancelBeadDrag}
   aria-hidden="true"
  >
   <span className="ax-island-bulge" aria-hidden="true">
    <span className="ax-island-bulge-highlight"/>
    <span className="ax-island-bead-icon">{visualIndex===2?<Brand/>:<Icon name={beadIcon} size={23}/>}</span>
   </span>
  </span>
 </nav>
 {profile && <Dialog title="Your AX" className="stylist-dialog" onClose={()=>setProfile(false)}><h3 className="editorial sheet-title">Make yourself at home.</h3><p>{!accountEnabled?'Access your orders through your store account.':checking?'Checking your AX account…':signedIn?'Your AX account is connected. Orders, tracking and saved details are ready here.':accountState==='signed-out'?'Sign in or create an account to keep orders and account details within AX.':'Open your AX account to continue.'}</p>{primaryHref&&!checking?<a className="solid-button" href={primaryHref}>{primaryLabel} <Icon name="arrow"/></a>:checking?<p className="small muted">Checking sign-in status…</p>:<p className="muted">Account sign-in will be available when the store opens.</p>}{signedIn&&<form action="/account/logout" method="post"><button className="underlined-link" type="submit">SIGN OUT <span aria-hidden="true">→</span></button></form>}<p className="small muted">Manage optional measurements and preferences in AX Stylist → My fit & style.</p></Dialog>}</>;
}
