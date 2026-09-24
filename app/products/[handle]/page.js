import Link from 'next/link';
import {preload} from 'react-dom';
import {notFound} from 'next/navigation';
import ProductPurchase from '../../../components/ProductPurchase';
import {getCompleteLookProducts,getMerchandisingProducts,getProduct} from '../../../lib/shopify';
import {complementaryProducts} from '../../../lib/merchandising';
import ProductCard from '../../../components/ProductCard';
import Icon from '../../../components/Icon';
import {breadcrumbJsonLd,jsonLd,pageMetadata,productGroupJsonLd} from '../../../lib/seo';
import {findVariant} from '../../../lib/commerce';
import {initialSelection,selectionImage} from '../../../lib/product-variants';
import {imageSrcSet,imageUrl} from '../../../components/ProductImage';
import RecentlyViewed from '../../../components/RecentlyViewed';
import {restockAlertSignupConfigured} from '../../../lib/restock-config.js';

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
 try { catalog=await getMerchandisingProducts(250); } catch {}
 const colourGroup=String(product.colorGroup||'').trim().toLowerCase();
 const colourwayListings=colourGroup?catalog.filter(item=>item.handle!==product.handle && String(item.colorGroup||'').trim().toLowerCase()===colourGroup):[];
 const colourways=colourwayListings.length?[product,...colourwayListings]:[];
 const colourwayHandles=new Set(colourwayListings.map(item=>item.handle));
 const merchandisingCatalog=catalog.filter(item=>!colourwayHandles.has(item.handle));
 const lookCandidates=complementaryProducts(product,merchandisingCatalog,3);
 let completeLook=[];
 try { completeLook=await getCompleteLookProducts(lookCandidates.map(item=>item.handle)); } catch {}
 const lookHandles=new Set(completeLook.map(item=>item.handle));
 const related=merchandisingCatalog.filter(p => p.handle!==handle && !lookHandles.has(p.handle)).slice(0,4);
 const structured=[
  productGroupJsonLd(product),
  breadcrumbJsonLd([{name:'Products',path:'/products'},{name:product.title,path:`/products/${product.handle}`}])
 ];
 return <main id="main-content">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(structured)}}/>
  <div className="breadcrumb"><Link href="/products">Collection</Link><span>/</span><span>{product.title}</span></div>
  <ProductPurchase key={product.id+':'+initialVariantId+':'+chooseSize} product={product} initialVariantId={initialVariantId} chooseSize={chooseSize} restockAlertsEnabled={restockAlertSignupConfigured()} colourways={colourways} completeLookItems={completeLook}/>
  {related.length>0 && <section className="section-wrap related-section"><div className="section-head"><h2 className="editorial">More to make your own.</h2><Link href="/products" className="underlined-link">EXPLORE ALL <Icon name="arrow"/></Link></div><div className="product-grid">{related.map(p => <ProductCard key={p.id} product={p}/>)}</div></section>}
  <RecentlyViewed excludeHandles={[product.handle]}/>
 </main>;
}
