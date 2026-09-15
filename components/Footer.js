import Link from 'next/link';
import Brand from './Brand';
export default function Footer() {
 return <footer className="footer"><div className="footer-main"><div><Link href="/" aria-label="AX home"><Brand/></Link><p>Menswear, in your own way.</p><p className="small muted">Coimbatore, Tamil Nadu · Since 2020</p></div><nav aria-label="Customer care"><p className="eyebrow">HERE TO HELP</p><Link href="/help">Contact & store</Link><Link href="/help#delivery">Delivery</Link><Link href="/help#exchanges">Exchanges & returns</Link></nav><nav aria-label="Explore the collection"><p className="eyebrow">EXPLORE</p><Link href="/products">New arrivals</Link><Link href="/products?style=old-school">The old school edit</Link><Link href="/products?style=linen">Linen & light layers</Link></nav></div><div className="footer-bottom"><span>© {new Date().getFullYear()} AX MEN’S STORE</span><span>CURATED IN COIMBATORE. DELIVERED ACROSS INDIA.</span></div></footer>;
}
