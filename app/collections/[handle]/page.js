import {notFound} from 'next/navigation';
import ProductGridClient from '../../../components/ProductGridClient';
import {getCollection} from '../../../lib/shopify';
import {breadcrumbJsonLd,collectionJsonLd,jsonLd,pageMetadata} from '../../../lib/seo';

export async function generateMetadata({params}) {
 const {handle}=await params,collection=await getCollection(handle);
 if(!collection) return {title:'Collection'};
 const hasProducts=(collection.products || []).length>0,indexing=process.env.AX_ALLOW_INDEXING==='true';
 return {
  ...pageMetadata({
   title:collection.seo?.title || `${collection.title} for Men`,
   description:collection.seo?.description || collection.description || `Explore ${collection.title} at AX Men’s Store. Curated menswear from Coimbatore with delivery across India.`,
   path:`/collections/${collection.handle}`,
   image:collection.products?.find(product=>product.image)?.image
  }),
  robots:{index:indexing && hasProducts,follow:indexing}
 };
}

export default async function CollectionPage({params}) {
 const {handle}=await params, collection=await getCollection(handle);
 if(!collection) notFound();
 const structured=[
  collectionJsonLd(collection),
  breadcrumbJsonLd([{name:'Collections',path:'/collections'},{name:collection.title,path:`/collections/${collection.handle}`}])
 ];
 return <main id="main-content" className="products-page">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(structured)}}/>
  <ProductGridClient products={collection.products} title={collection.title} collection/>
  {collection.description && <section className="collection-description" aria-label={`About ${collection.title}`}><h2>About {collection.title}</h2><p>{collection.description}</p></section>}
 </main>;
}
