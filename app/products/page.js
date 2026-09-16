import ProductGridClient from '../../components/ProductGridClient';
import {getProducts} from '../../lib/shopify';
import {navigation} from '../../lib/navigation';
import {pageMetadata} from '../../lib/seo';

export const metadata=pageMetadata({
 title:'New Men’s Clothing & Latest Drops',
 description:'Shop the latest AX shirts, T-shirts, denim, trousers, Korean fits, streetwear and everyday menswear. Curated in Coimbatore and delivered across India.',
 path:'/products'
});

export default async function ProductsPage({searchParams}) {
 const [products,params]=await Promise.all([getProducts(),searchParams]);
 const value=key => typeof params?.[key]==='string' ? params[key] : '';
 const type=navigation.some(item => item.key===value('type'))?value('type'):'all';
 return <main id="main-content" className="products-page"><ProductGridClient products={products} initialTerm={value('q')} initialType={type} initialStyle={value('style')} searchOpen={value('search')==='1'}/></main>;
}
