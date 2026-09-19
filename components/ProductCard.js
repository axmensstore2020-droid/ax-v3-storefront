import Link from 'next/link';
import {formatMoney} from '../lib/catalog';
import ProductImage from './ProductImage';
import WishlistButton from './WishlistButton';

const GRID_WIDTHS=[180,240,280,320,360,400,480,560,640];
const COMPACT_WIDTHS=[120,160,200,240,280,320,400];
const PEOPLE_WORDS=/\b(model|mannequin|dummy|torso|human|person|man|men|male|wearing|worn|styled|outfit|lookbook|on[-_ ]?model)\b/i;
const PRODUCT_ONLY_WORDS=/\b(wide[-_ ]?view|product[-_ ]?only|flat[-_ ]?lay|flatlay|garment[-_ ]?only|packshot|isolated|no[-_ ]?model|hanger|hanging)\b/i;

function imageText(image){
 return `${image?.altText||''} ${image?.url||''}`;
}
function safeWideImage(image){
 return Boolean(image?.url)&&!PEOPLE_WORDS.test(imageText(image));
}
function wideViewImage(product){
 const images=(product.images||[]).filter(image=>image?.url);
 const explicit=images.find(image=>safeWideImage(image)&&PRODUCT_ONLY_WORDS.test(imageText(image)));
 const variant=safeWideImage(product.variantImage)?product.variantImage:null;
 const featured=product.image || '';
 const alternate=images.find(image=>image.url!==featured&&safeWideImage(image));
 const anySafe=images.find(safeWideImage);
 return explicit || variant || alternate || anySafe || null;
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
