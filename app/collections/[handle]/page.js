import {notFound} from 'next/navigation';
import ProductGridClient from '../../../components/ProductGridClient';
import {getCollection} from '../../../lib/shopify';
export async function generateMetadata({params}) {const {handle}=await params; const collection=await getCollection(handle); return {title:collection?.title || 'Collection'};}
export default async function CollectionPage({params}) {
 const {handle}=await params, collection=await getCollection(handle);
 if(!collection) notFound();
 return <main id="main-content" className="products-page"><ProductGridClient products={collection.products} title={collection.title} collection/></main>;
}
