import Link from 'next/link';
import {notFound} from 'next/navigation';
import AddToCart from '../../../components/AddToCart';
import ProductDataPanel from '../../../components/ProductDataPanel';
import {getProduct,getProducts} from '../../../lib/shopify';
import ProductCard from '../../../components/ProductCard';
import ProductImage from '../../../components/ProductImage';
import {StylistButton} from '../../../components/StylistProvider';
import Icon from '../../../components/Icon';
export async function generateMetadata({params}) {const {handle}=await params;const product=await getProduct(handle);return {title:product?.title || 'Product',description:product?.description};}
export default async function ProductPage({params}) {
 const {handle}=await params, product=await getProduct(handle);
 if(!product) notFound();
 const related=(await getProducts()).filter(p => p.handle!==handle).slice(0,4);
 const gallery=product.images?.length?product.images:product.image?[{url:product.image,altText:product.title}]:[];
 return <main id="main-content"><div className="breadcrumb"><Link href="/products">Collection</Link><span>/</span><span>{product.title}</span></div><section className="pdp"><div className={`pdp-gallery${gallery.length===1?' single-image':''}`}>{gallery.map((img,i) => <div className="pdp-image" key={img.url+'-'+i}><ProductImage src={img.url} alt={img.altText || product.title+', view '+(i+1)} sizes="(max-width:700px) 100vw,56vw" eager={i===0}/></div>)}</div><div className="pdp-info"><p className="eyebrow">{product.type || 'AX MENSWEAR'}</p><h1 className="editorial">{product.title}</h1><AddToCart product={product}/><div className="product-details"><details open><summary>About this piece</summary><p>{product.description || 'For more details about this piece, contact the AX team.'}</p></details><details><summary>Delivery & exchanges</summary><p>Shipping across India. Available delivery options and charges are shown at checkout.</p><Link className="text-link" href="/help#exchanges">Read our exchange policy</Link></details></div><ProductDataPanel product={product}/><StylistButton className="underlined-link pdp-stylist" product={{title:product.title}}>STYLE WITH AX <Icon name="arrow"/></StylistButton></div></section>{related.length>0 && <section className="section-wrap related-section"><div className="section-head"><h2 className="editorial">More to make your own.</h2><Link href="/products" className="underlined-link">EXPLORE ALL <Icon name="arrow"/></Link></div><div className="product-grid">{related.map(p => <ProductCard key={p.id} product={p}/>)}</div></section>}</main>;
}
