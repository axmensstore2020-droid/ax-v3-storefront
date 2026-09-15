'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Dialog from './Dialog';
import Icon from './Icon';
import {useNavigation} from './NavigationProvider';
import {contactHref} from '../lib/store-info';
export default function StylistPanel({ request,onClose }) {
 const sizing = request.mode === 'size', router = useRouter();
 const {styles}=useNavigation();
 function search(event) { event.preventDefault(); const query = new FormData(event.currentTarget).get('q'); router.push('/products?q=' + encodeURIComponent(query)); onClose(); }
 return <Dialog title="AX Stylist" className="stylist-dialog" onClose={onClose}><p className="eyebrow">A LITTLE DIRECTION</p><h3 className="editorial sheet-title">{sizing ? 'Find your fit.' : 'What feels like you?'}</h3>{request.product && <p className="styling-product">{request.product.title}</p>}
 {sizing ? <><p>Personal size recommendations are coming soon. Check the available sizes and compare garment measurements before choosing.</p><p className="muted">Need measurements for this piece? Ask the AX team before ordering.</p><a className="solid-button" href={`${contactHref}?subject=${encodeURIComponent('Garment measurements')}&body=${encodeURIComponent('Hi AX, could you share garment measurements for ' + (request.product?.title || 'a product') + '?')}`}>ASK ABOUT MEASUREMENTS <Icon name="arrow"/></a></> : <><p>Explore a mood. Find pieces that fit your day.</p><div className="style-links">{styles.map(style => <Link key={style.key} href={style.href} onClick={onClose}>{style.label}<Icon name="arrow"/></Link>)}</div><form className="stylist-search" onSubmit={search}><label htmlFor="stylist-query">Find something specific</label><div><input id="stylist-query" name="q" placeholder="Try polo, linen, checked…" required maxLength={120}/><button className="icon-button" aria-label="Search the collection"><Icon name="arrow"/></button></div></form><p className="small muted">Personal AI styling and photo matching are coming soon. For now, explore the collection by style.</p></>}<Link className="stylist-info-link" href="/ax-stylist" onClick={onClose}>How AX Stylist works & what is stored <Icon name="arrow" size={16}/></Link></Dialog>;
}
