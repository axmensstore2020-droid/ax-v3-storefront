'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {animate} from 'motion';
import Brand from './Brand';
import Icon from './Icon';
import Dialog from './Dialog';
import {useStylist} from './StylistProvider';
import {AX_MOTION} from '../lib/motion';

export default function AXIsland({accountUrl,accountEnabled=false}) {
 const path=usePathname(),[profile,setProfile]=useState(false),[accountState,setAccountState]=useState(accountEnabled?'unknown':'disabled'),[collapsed,setCollapsed]=useState(false),[desktop,setDesktop]=useState(false),{openStylist}=useStylist();
 const islandRef=useRef(null);
 const productMatch=path.match(/^\/products\/([^/]+)\/?$/),currentProduct=productMatch?{handle:productMatch[1]}:null;

 useEffect(()=>{
  const media=window.matchMedia('(min-width:1100px)');
  const sync=()=>{
   setDesktop(media.matches);
   if(!media.matches) setCollapsed(false);
  };
  sync();
  media.addEventListener?.('change',sync);
  return()=>media.removeEventListener?.('change',sync);
 },[]);

 useEffect(()=>{
  const island=islandRef.current;
  if(!island) return;
  const items=[...island.querySelectorAll('.island-item,.island-stylist')];
  if(!desktop){
   items.forEach(item=>item.style.removeProperty('opacity'));
   return;
  }
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   items.forEach(item=>item.style.opacity=collapsed?'0':'1');
   return;
  }
  const controls=animate(
   items,
   {opacity:collapsed?[1,0]:[0,1]},
   {
    duration:collapsed?0.12:0.18,
    ease:AX_MOTION.panel.ease,
    delay:collapsed?0:0.06
   }
  );
  return()=>controls.stop?.();
 },[collapsed,desktop]);

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
 const hidden=desktop&&collapsed;
 const hiddenProps=hidden?{tabIndex:-1,'aria-hidden':true}:{};

 return <><nav ref={islandRef} id="ax-island-navigation" className={`ax-island${collapsed?' is-collapsed':''}`} aria-label="AX navigation">
  <svg className="island-surface" viewBox="0 0 420 94" preserveAspectRatio="none" aria-hidden="true"><path d="M36 24H157C176 24 180 3 210 3S244 24 263 24H384A33 33 0 0 1 417 57V58A33 33 0 0 1 384 91H36A33 33 0 0 1 3 58V57A33 33 0 0 1 36 24Z"/></svg>
  <Link href="/" className="island-item" aria-current={path === '/' ? 'page' : undefined} {...hiddenProps}><Icon name="home"/><span>Home</span></Link>
  <Link href="/products" className="island-item" aria-current={path.startsWith('/products') || path.startsWith('/collections') ? 'page' : undefined} {...hiddenProps}><Icon name="explore"/><span>Explore</span></Link>
  <button className="island-stylist" onClick={() => openStylist('style',currentProduct)} aria-label="Open AX Stylist" {...hiddenProps}><span className="ax-orb"><Brand inverse/></span><span>Stylist</span></button>
  <Link href="/products?search=1" className="island-item" {...hiddenProps}><Icon name="search"/><span>Search</span></Link>
  <button className="island-item" onClick={openProfile} {...hiddenProps}><Icon name="profile"/><span>Profile</span></button>
  <button
   type="button"
   className="island-collapse-toggle"
   aria-controls="ax-island-navigation"
   aria-expanded={!collapsed}
   aria-label={collapsed?'Expand AX navigation':'Collapse AX navigation'}
   onClick={()=>setCollapsed(value=>!value)}
  ><span aria-hidden="true">{collapsed?'›':'‹'}</span></button>
 </nav>
 {profile && <Dialog title="Your AX" className="stylist-dialog" onClose={() => setProfile(false)}><h3 className="editorial sheet-title">Make yourself at home.</h3><p>{!accountEnabled?'Access your orders through your store account.':checking?'Checking your AX account…':signedIn?'Your AX account is connected. Orders, tracking and saved details are ready here.':accountState==='signed-out'?'Sign in or create an account to keep orders and account details within AX.':'Open your AX account to continue.'}</p>{primaryHref && !checking ? <a className="solid-button" href={primaryHref}>{primaryLabel} <Icon name="arrow"/></a> : checking ? <p className="small muted">Checking sign-in status…</p> : <p className="muted">Account sign-in will be available when the store opens.</p>}{signedIn && <form action="/account/logout" method="post"><button className="underlined-link" type="submit">SIGN OUT <span aria-hidden="true">→</span></button></form>}<p className="small muted">Manage optional measurements and preferences in AX Stylist → My fit & style.</p></Dialog>}</>;
}
