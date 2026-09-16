import Link from 'next/link';
import {notFound} from 'next/navigation';
import ProductPurchase from '../../../components/ProductPurchase';
import ProductDataPanel from '../../../components/ProductDataPanel';
import {getProduct,getProducts} from '../../../lib/shopify';
import ProductCard from '../../../components/ProductCard';
import Icon from '../../../components/Icon';
import {breadcrumbJsonLd,jsonLd,pageMetadata,productJsonLd} from '../../../lib/seo';

export async function generateMetadata({params}) {
 const {handle}=await params,product=await getProduct(handle);
 if(!product) return {title:'Product'};
 return pageMetadata({
  title:product.seo?.title || product.title,
  description:product.seo?.description || product.description || `${product.title} from AX Men’s Store. Explore fit, fabric, available sizes and delivery across India.`,
  path:`/products/${product.handle}`,
  image:product.image || product.images?.[0]?.url,
  type:'website'
 });
}

export default async function ProductPage({params,searchParams}) {
 const {handle}=await params, product=await getProduct(handle);
 if(!product) notFound();
 const related=(await getProducts()).filter(p => p.handle!==handle).slice(0,4);
 const query=await searchParams, initialVariantId=typeof query?.variant==='string'?query.variant:'', chooseSize=query?.chooseSize==='1';
 const structured=[
  productJsonLd(product),
  breadcrumbJsonLd([{name:'Products',path:'/products'},{name:product.title,path:`/products/${product.handle}`}])
 ];
 return <main id="main-content">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(structured)}}/>
  <div className="breadcrumb"><Link href="/products">Collection</Link><span>/</span><span>{product.title}</span></div>
  <ProductPurchase key={product.id+':'+initialVariantId+':'+chooseSize} product={product} initialVariantId={initialVariantId} chooseSize={chooseSize}>
   <div className="product-details"><details open><summary>About this piece</summary><p>{product.description || 'For more details about this piece, contact the AX team.'}</p></details><details><summary>Delivery & exchanges</summary><p>Shipping across India. Available delivery options and charges are shown at checkout.</p><Link className="text-link" href="/help#exchanges">Read our exchange policy</Link></details></div>
   <ProductDataPanel product={product}/>
  </ProductPurchase>
  {related.length>0 && <section className="section-wrap related-section"><div className="section-head"><h2 className="editorial">More to make your own.</h2><Link href="/products" className="underlined-link">EXPLORE ALL <Icon name="arrow"/></Link></div><div className="product-grid">{related.map(p => <ProductCard key={p.id} product={p}/>)}</div></section>}
 </main>;
}
