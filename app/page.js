import Link from 'next/link';
import ProductGridClient from '../components/ProductGridClient';
import ProductImage from '../components/ProductImage';
import Icon from '../components/Icon';
import {StylistButton} from '../components/StylistProvider';
import {getProducts} from '../lib/shopify';
import {matchesCategory} from '../lib/navigation';
import {getNavigation} from '../lib/content';
export const revalidate=60;
export default async function Home() {
 const [products,{categories,styles}]=await Promise.all([getProducts(),getNavigation()]);
 const hero=products.find(p => p.image && /polo|linen|tailor/i.test([p.title,...(p.tags||[])].join(' '))) || products.find(p => p.image);
 const second=products.find(p => p.image && p.id!==hero?.id && /flannel/i.test(p.title)) || products.find(p => p.image && p.id!==hero?.id && matchesCategory(p,'shirts'));
 return <main id="main-content"><section className="hero"><div className="hero-copy"><p className="eyebrow">THE EVERYDAY EDIT</p><h1 className="editorial">A wardrobe.<br/><em>Your way.</em></h1><p>Clean lines. Easy layers.<br/> Room to be yourself.</p><Link className="underlined-link" href="/products">DISCOVER NEW IN <Icon name="arrow"/></Link><span className="hero-index">01 / THE AX EDIT</span></div><div className="hero-photos">{hero && <Link className="hero-photo hero-primary" href={`/products/${hero.handle}`}><ProductImage src={hero.image} alt={hero.title} eager sizes="(max-width:700px) 60vw,40vw"/><span>{hero.title}<Icon name="arrow"/></span></Link>}{second && <Link className="hero-photo hero-secondary" href={`/products/${second.handle}`}><ProductImage src={second.image} alt={second.title} sizes="(max-width:700px) 40vw,24vw"/><span>AN EVERYDAY CLASSIC <Icon name="arrow"/></span></Link>}</div></section>
 <section className="arrival-section section-wrap" aria-label="New arrivals"><ProductGridClient products={products.slice(0,8)} title="New arrivals" home/><div className="section-bottom"><Link className="underlined-link" href="/products">EXPLORE THE COLLECTION <Icon name="arrow"/></Link></div></section>
 <section className="wardrobe-section section-wrap"><div className="section-intro"><p className="eyebrow">FIND YOUR NEXT PIECE</p><h2 className="editorial">The whole wardrobe.</h2><p>From a slower Sunday to a sharper Monday.</p></div><nav className="category-directory" aria-label="Shop categories">{categories.filter(item=>item.href!=='/products').slice(0,8).map((item,i) => <Link href={item.href} key={item.key}><span className="category-number">0{i+1}</span><span>{item.label}</span><Icon name="arrow"/></Link>)}</nav></section>
 <section className="edits-section section-wrap"><div className="section-head"><div><p className="eyebrow">A DIFFERENT POINT OF VIEW</p><h2 className="editorial">The style collections.</h2></div></div><div className="style-worlds">{styles.map(style => <Link key={style.key} href={style.href}>{style.label}<Icon name="arrow"/></Link>)}</div><div className="ask-ax"><p>Something in mind?</p><StylistButton className="underlined-link">EXPLORE WITH AX <Icon name="arrow"/></StylistButton></div></section>
 <section className="community-section"><p className="eyebrow">FROM OUR CITY TO YOUR EVERYDAY</p><h2 className="editorial">Coimbatore. And beyond.</h2><p>New pieces, familiar faces. Find your next favourite at Sai Baba Colony or Thadagam Road.</p><Link className="underlined-link" href="/stores">COME SAY HELLO <Icon name="arrow"/></Link></section></main>;
}
