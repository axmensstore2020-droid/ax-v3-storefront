import Link from 'next/link';
import {formatMoney} from '../lib/catalog';
import ProductImage from './ProductImage';
export default function ProductCard({product,compact=false}) {
 return <article className={`product-card${compact?' compact':''}`}><Link className="product-image-wrap" href={`/products/${product.handle}`} aria-label={`${product.title}, ${formatMoney(product.price,product.currency)}`}><ProductImage src={product.image} alt={product.imageAlt || product.title} sizes={compact?'(max-width:700px) 25vw,12.5vw':'(max-width:700px) 50vw,25vw'}/></Link><div className="product-meta"><Link href={`/products/${product.handle}`}>{product.title}</Link><p>{formatMoney(product.price,product.currency)}{product.availableForSale===false && <span className="stock-label">Sold out</span>}</p></div></article>;
}
