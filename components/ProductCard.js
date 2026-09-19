import Link from 'next/link';
import {formatMoney} from '../lib/catalog';
import ProductImage from './ProductImage';
import WishlistButton from './WishlistButton';

const GRID_WIDTHS=[180,240,280,320,360,400,480,560,640];
const COMPACT_WIDTHS=[120,160,200,240,280,320,400];

export default function ProductCard({product,compact=false}) {
 const sizes=compact
  ? '(max-width:700px) 22vw,11vw'
  : '(max-width:700px) 45vw,23vw';
 const price=Number(product.price || 0),compareAt=Number(product.compareAtPrice || 0);
 const onSale=Number.isFinite(compareAt) && compareAt>price;
 const discount=onSale?Math.round(((compareAt-price)/compareAt)*100):0;
 return <article className={`product-card${compact?' compact':''}`}>
  <WishlistButton handle={product.handle} className="product-card-wishlist"/>
  <Link className="product-image-wrap" href={`/products/${product.handle}`} aria-label={`${product.title}, ${formatMoney(product.price,product.currency)}`}>
   <ProductImage src={product.image} alt={product.imageAlt || product.title} sizes={sizes} widths={compact?COMPACT_WIDTHS:GRID_WIDTHS} fallbackWidth={compact?240:480}/>
  </Link>
  <div className="product-meta">
   <Link href={`/products/${product.handle}`}>{product.title}</Link>
   <p>
    <span className="price-group">
     <strong className="selling-price">{formatMoney(price,product.currency)}</strong>
     {onSale && <><s className="compare-price">MRP {formatMoney(compareAt,product.currency)}</s><em className="discount-badge">{discount}% OFF</em></>}
    </span>
    {product.availableForSale===false && <span className="stock-label">Sold out</span>}
   </p>
  </div>
 </article>;
}
