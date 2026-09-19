import Link from 'next/link';
import {formatMoney} from '../lib/catalog';
import ProductImage from './ProductImage';
import WishlistButton from './WishlistButton';

const GRID_WIDTHS=[180,240,280,320,360,400,480,560,640];
const COMPACT_WIDTHS=[120,160,200,240,280,320,400];
const MODEL_WORDS=/\b(model|man|men|male|person|wearing|worn|styled|outfit|lookbook)\b/i;
const PRODUCT_WORDS=/\b(product|flat\s?lay|flatlay|garment|front|back|detail|hanger|tee|t-?shirt|shirt|jacket|hoodie|jeans?|pants?|trousers?|cargo|shorts?)\b/i;

function wideViewImage(product){
 const images=(product.images||[]).filter(image=>image?.url);
 const labelled=images.filter(image=>String(image.altText||'').trim());
 const explicit=labelled.find(image=>PRODUCT_WORDS.test(image.altText||'')&&!MODEL_WORDS.test(image.altText||''));
 const variant=product.variantImage?.url ? product.variantImage : null;
 const labelledNonModel=labelled.find(image=>!MODEL_WORDS.test(image.altText||''));
 return explicit || variant || labelledNonModel || images.at(-1) || (product.image?{url:product.image,altText:product.imageAlt}:null);
}

export default function ProductCard({product,compact=false}) {
 const sizes=compact
  ? '(max-width:700px) 24vw,12vw'
  : '(max-width:700px) 45vw,23vw';
 const price=Number(product.price || 0),compareAt=Number(product.compareAtPrice || 0);
 const onSale=Number.isFinite(compareAt) && compareAt>price;
 const discount=onSale?Math.round(((compareAt-price)/compareAt)*100):0;
 const selectedImage=compact?wideViewImage(product):null;
 const imageSrc=selectedImage?.url || product.image;
 const imageAlt=selectedImage?.altText || product.imageAlt || product.title;
 return <article className={`product-card${compact?' compact':''}`}>
  {!compact&&<WishlistButton handle={product.handle} className="product-card-wishlist"/>}
  <Link className="product-image-wrap" href={`/products/${product.handle}`} aria-label={`${product.title}, ${formatMoney(product.price,product.currency)}`}>
   <ProductImage src={imageSrc} alt={imageAlt} sizes={sizes} widths={compact?COMPACT_WIDTHS:GRID_WIDTHS} fallbackWidth={compact?320:480}/>
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
