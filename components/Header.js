'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useCart } from './CartProvider';
import Brand from './Brand';
import Icon from './Icon';
import Dialog from './Dialog';
import {useNavigation} from './NavigationProvider';
function MenuItems({items,path,onClose}) {
 return items.map(item=><div key={item.key} className="category-menu-item"><Link href={item.href} aria-current={path===item.href?'page':undefined} onClick={onClose}>{item.label}</Link>{item.items?.length>0 && <div className="category-menu-children"><MenuItems items={item.items} path={path} onClose={onClose}/></div>}</div>);
}
export default function Header() {
 const [menu,setMenu] = useState(false), path = usePathname();
 const { count,setOpen } = useCart();
 const {categories,styles,seasons}=useNavigation(),close=()=>setMenu(false);
 return <><header className="header"><div className="header-top"><Link className="brand" href="/" aria-label="AX home"><Brand/></Link><span className="brand-location">COIMBATORE · EST. 2020</span><div className="header-actions"><Link className="header-search" href="/products?search=1"><Icon name="search"/><span>Search</span></Link><button className="bag-button" aria-label={`Bag, ${count} items`} onClick={() => setOpen(true)}>BAG <span>({count})</span></button><button className="categories-button" onClick={() => setMenu(true)} aria-label="Open categories" aria-haspopup="dialog" aria-expanded={menu} aria-controls="ax-category-menu">CATEGORIES <Icon name="chevron" size={16}/></button></div></div></header>
 {menu && <Dialog id="ax-category-menu" title="Categories" className="category-dialog" onClose={close}><nav className="category-menu" aria-label="Product categories"><MenuItems items={categories} path={path} onClose={close}/></nav><details className="menu-group"><summary>STYLE COLLECTIONS <Icon name="chevron" size={16}/></summary><nav aria-label="Style collections"><MenuItems items={styles} path={path} onClose={close}/></nav></details><details className="menu-group"><summary>SEASONAL COLLECTIONS <Icon name="chevron" size={16}/></summary><nav aria-label="Seasonal collections"><MenuItems items={seasons} path={path} onClose={close}/></nav></details><div className="menu-utility"><Link href="/stores" onClick={close}>Stores</Link><Link href="/help" onClick={close}>Here to help</Link></div></Dialog>}</>;
}
