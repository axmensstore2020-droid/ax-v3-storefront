import Link from 'next/link';
import {formatMoney} from '../lib/catalog';
import ProductImage from './ProductImage';

const GRID_WIDTHS=[180,240,280,320,360,400,480,560,640];
const COMPACT_WIDTHS=[120,160,200,240,280,320,400];

export default function ProductCard({product,compact=false}) {
 const sizes=compact
  ? '(max-width:700px) 22vw,11vw'
  : '(max-width:700px) 45vw,23vw';
 return <article className={`product-card${compact?' compact':''}`}><Link className="product-image-wrap" href={`/products/${product.handle}`} aria-label={`${product.title}, ${formatMoney(product.price,product.currency)}`}><ProductImage src={product.image} alt={product.imageAlt || product.title} sizes={sizes} widths={compact?COMPACT_WIDTHS:GRID_WIDTHS} fallbackWidth={compact?240:480}/></Link><div className="product-meta"><Link href={`/products/${product.handle}`}>{product.title}</Link><p>{formatMoney(product.price,product.currency)}{product.availableForSale===false && <span className="stock-label">Sold out</span>}</p></div></article>;
}
