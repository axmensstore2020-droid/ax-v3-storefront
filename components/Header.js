'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useCart } from './CartProvider';
import Brand from './Brand';
import Icon from './Icon';
import Dialog from './Dialog';
import { navigation, styleWorlds } from '../lib/navigation';
export default function Header() {
 const [menu,setMenu] = useState(false), path = usePathname();
 const { count,setOpen } = useCart();
 return <><header className="header"><div className="header-top"><Link className="brand" href="/" aria-label="AX home"><Brand/></Link><span className="brand-location">COIMBATORE · EST. 2020</span><div className="header-actions"><Link className="header-search" href="/products?search=1"><Icon name="search"/><span>Search</span></Link><button className="bag-button" aria-label={`Bag, ${count} items`} onClick={() => setOpen(true)}>BAG <span>({count})</span></button><button className="icon-button menu-button" onClick={() => setMenu(true)} aria-label="Open menu"><Icon name="menu"/></button></div></div><nav className="category-nav" aria-label="Product categories">{navigation.map(item => <Link key={item.key} href={item.href} aria-current={path === item.href ? 'page' : undefined}>{item.label}</Link>)}</nav></header>
 {menu && <Dialog title="Explore AX" className="side-dialog" onClose={() => setMenu(false)}><nav className="menu-links" aria-label="All categories">{navigation.map(item => <Link key={item.key} href={item.href} onClick={() => setMenu(false)}>{item.label}<Icon name="arrow"/></Link>)}</nav><p className="eyebrow menu-label">THE STYLE EDITS</p><div className="menu-styles">{styleWorlds.map(style => <Link key={style.key} href={`/products?style=${style.key}`} onClick={() => setMenu(false)}>{style.label}</Link>)}</div><p className="muted">Menswear for every side of you.</p></Dialog>}</>;
}
