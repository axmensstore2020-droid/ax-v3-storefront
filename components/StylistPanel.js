'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Dialog from './Dialog';
import Icon from './Icon';
import { styleWorlds } from '../lib/navigation';
export default function StylistPanel({ request,onClose }) {
 const sizing = request.mode === 'size', router = useRouter();
 function search(event) { event.preventDefault(); const query = new FormData(event.currentTarget).get('q'); router.push('/products?q=' + encodeURIComponent(query)); onClose(); }
 return <Dialog title="AX Stylist" className="stylist-dialog" onClose={onClose}><p className="eyebrow">A LITTLE DIRECTION</p><h3 className="serif sheet-title">{sizing ? 'Find your fit.' : 'What feels like you?'}</h3>{request.product && <p className="styling-product">{request.product.title}</p>}
 {sizing ? <><p>Personal size recommendations are coming soon. Check the available sizes and compare garment measurements before choosing.</p><p className="muted">Need measurements for this piece? Ask the AX team before ordering.</p><a className="solid-button" href={`https://wa.me/918903044818?text=${encodeURIComponent('Hi AX, could you share garment measurements for ' + (request.product?.title || 'a product') + '?')}`} target="_blank" rel="noreferrer">ASK ABOUT MEASUREMENTS <Icon name="arrow"/></a></> : <><p>Explore a mood. Find pieces that fit your day.</p><div className="style-links">{styleWorlds.map(style => <Link key={style.key} href={`/products?style=${style.key}`} onClick={onClose}>{style.label}<Icon name="arrow"/></Link>)}</div><form className="stylist-search" onSubmit={search}><label htmlFor="stylist-query">Find something specific</label><div><input id="stylist-query" name="q" placeholder="Try polo, linen, checked…" required/><button className="icon-button" aria-label="Search the collection"><Icon name="arrow"/></button></div></form><p className="small muted">Personal AI styling and photo matching are coming soon. For now, explore the collection by style.</p></>}</Dialog>;
}
