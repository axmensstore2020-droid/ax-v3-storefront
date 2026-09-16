import {getCollections,getProducts} from '../lib/shopify';
import {absoluteUrl} from '../lib/seo';

export const revalidate=3600;

function modified(value){
 const date=value?new Date(value):null;
 return date && Number.isFinite(date.getTime()) ? date : undefined;
}

export default async function sitemap(){
 const [products,collections]=await Promise.all([getProducts(250),getCollections(250)]);
 const staticPages=[
  ['/',1,'daily'],['/products',0.9,'daily'],['/collections',0.8,'weekly'],['/stores',0.8,'monthly'],
  ['/about',0.6,'monthly'],['/help',0.5,'monthly'],['/faqs',0.5,'monthly'],['/contact',0.5,'monthly'],
  ['/policies',0.4,'monthly'],['/ax-stylist',0.6,'monthly']
 ].map(([path,priority,changeFrequency])=>({url:absoluteUrl(path),priority,changeFrequency}));
 const collectionPages=collections.filter(collection=>collection?.handle).map(collection=>({
  url:absoluteUrl(`/collections/${collection.handle}`),
  ...(modified(collection.updatedAt)?{lastModified:modified(collection.updatedAt)}:{}),
  changeFrequency:'weekly',priority:0.75
 }));
 const productPages=products.filter(product=>product?.handle).map(product=>({
  url:absoluteUrl(`/products/${product.handle}`),
  ...(modified(product.updatedAt)?{lastModified:modified(product.updatedAt)}:{}),
  changeFrequency:'weekly',priority:0.8
 }));
 return [...staticPages,...collectionPages,...productPages];
}
