'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Brand from './Brand';
import Icon from './Icon';
import Dialog from './Dialog';
import { useStylist } from './StylistProvider';
export default function AXIsland({ accountUrl }) {
 const path=usePathname(), [profile,setProfile]=useState(false), {openStylist}=useStylist();
 return <><nav className="ax-island" aria-label="AX navigation"><Link href="/" className="island-item" aria-current={path === '/' ? 'page' : undefined}><Icon name="home"/><span>Home</span></Link><Link href="/products" className="island-item" aria-current={path.startsWith('/products') || path.startsWith('/collections') ? 'page' : undefined}><Icon name="explore"/><span>Explore</span></Link><button className="island-stylist" onClick={() => openStylist()} aria-label="Open AX Stylist"><span className="ax-orb"><Brand inverse/></span><span>Stylist</span></button><Link href="/products?search=1" className="island-item"><Icon name="search"/><span>Search</span></Link><button className="island-item" onClick={() => setProfile(true)}><Icon name="profile"/><span>Profile</span></button></nav>
 {profile && <Dialog title="Your AX" className="stylist-dialog" onClose={() => setProfile(false)}><h3 className="serif sheet-title">Make yourself at home.</h3><p>Access your orders through your store account.</p>{accountUrl ? <a className="solid-button" href={accountUrl}>OPEN MY ACCOUNT <Icon name="arrow"/></a> : <p className="muted">Account sign-in will be available when the store opens.</p>}<p className="small muted">Saved style preferences are coming soon.</p></Dialog>}</>;
}
