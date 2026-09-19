import Link from 'next/link';
import {preload} from 'react-dom';
import {notFound} from 'next/navigation';
import ProductPurchase from '../../../components/ProductPurchase';
import {getProduct,getProducts} from '../../../lib/shopify';
import CompleteLook from '../../../components/CompleteLook';
import {complementaryProducts} from '../../../lib/merchandising';
import ProductCard from '../../../components/ProductCard';
import Icon from '../../../components/Icon';
import {breadcrumbJsonLd,jsonLd,pageMetadata,productGroupJsonLd} from '../../../lib/seo';
import {findVariant} from '../../../lib/commerce';
import {initialSelection,selectionImage} from '../../../lib/product-variants';
import {imageSrcSet,imageUrl} from '../../../components/ProductImage';
import RecentlyViewed from '../../../components/RecentlyViewed';

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
 const query=await searchParams, initialVariantId=typeof query?.variant==='string'?query.variant:'', chooseSize=query?.chooseSize==='1';
 const selected=initialSelection(product,initialVariantId,chooseSize),variant=findVariant(product.variants || [],selected),primary=selectionImage(product,selected,variant);
 if(primary?.url) preload(imageUrl(primary.url,800),{as:'image',fetchPriority:'high',imageSrcSet:imageSrcSet(primary.url,[320,480,600,720,800,960,1100,1200]),imageSizes:'(max-width:700px) 94vw,50vw'});
 let catalog=[];
 try { catalog=await getProducts(); } catch {}
 const lookCandidates=complementaryProducts(product,catalog,3);
 const lookResults=await Promise.allSettled(lookCandidates.map(item=>getProduct(item.handle)));
 const completeLook=lookResults.filter(result=>result.status==='fulfilled' && result.value).map(result=>result.value);
 const lookHandles=new Set(completeLook.map(item=>item.handle));
 const related=catalog.filter(p => p.handle!==handle && !lookHandles.has(p.handle)).slice(0,4);
 const structured=[
  productGroupJsonLd(product),
  breadcrumbJsonLd([{name:'Products',path:'/products'},{name:product.title,path:`/products/${product.handle}`}])
 ];
 return <main id="main-content">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(structured)}}/>
  <div className="breadcrumb"><Link href="/products">Collection</Link><span>/</span><span>{product.title}</span></div>
  <ProductPurchase key={product.id+':'+initialVariantId+':'+chooseSize} product={product} initialVariantId={initialVariantId} chooseSize={chooseSize} hasCompleteLook={completeLook.length>0}>
   <div className="product-details"><details open><summary>About this piece</summary><p>{product.description || 'For more details about this piece, contact the AX team.'}</p></details><details><summary>Delivery & exchanges</summary><p>Shipping across India. Use the pincode checker above for live Delhivery serviceability. When Delhivery provides a delivery estimate, we show it; final delivery options are confirmed at checkout.</p><Link className="text-link" href="/help#exchanges">Read our exchange policy</Link></details></div>
  </ProductPurchase>
  <CompleteLook product={product} items={completeLook}/>
  {related.length>0 && <section className="section-wrap related-section"><div className="section-head"><h2 className="editorial">More to make your own.</h2><Link href="/products" className="underlined-link">EXPLORE ALL <Icon name="arrow"/></Link></div><div className="product-grid">{related.map(p => <ProductCard key={p.id} product={p}/>)}</div></section>}
  <RecentlyViewed excludeHandles={[product.handle]}/>
 </main>;
}
