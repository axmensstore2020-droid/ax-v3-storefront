import Link from 'next/link';
import {formatMoney} from '../lib/catalog';
import ProductImage from './ProductImage';
import WishlistButton from './WishlistButton';

const GRID_WIDTHS=[180,240,280,320,360,400,480,560,640];
const COMPACT_WIDTHS=[120,160,200,240,280,320,400];
const PEOPLE_WORDS=/\b(model|human|person|man|men|male|wearing|worn|styled|outfit|lookbook|on[-_ ]?model)\b/i;
const PRODUCT_ONLY_WORDS=/\b(wide[-_ ]?view|product[-_ ]?only|flat[-_ ]?lay|flatlay|garment[-_ ]?only|packshot|isolated|no[-_ ]?model|hanger|hanging|mannequin|dummy|torso|dress[-_ ]?form)\b/i;

// These products use legacy/random Shopify filenames with blank alt text.
// Pick the known alternate media slot for Wide View instead of trusting the featured image.
const WIDE_VIEW_IMAGE_INDEX={
 'black-premium-linen-button-down-shirt':1,
 'maroon-premium-linen-button-down-shirt':1,
 'brown-premium-linen-button-down-shirt':1,
 'lavender-premium-linen-button-down-shirt':1,
 'white-premium-linen-button-down-shirt':1,
 'green-motorsport-inspired-racing-jacket':2
};

function imageText(image){
 return `${image?.altText||''} ${image?.url||''}`;
}
function explicitlyProductOnly(image){
 if(!image?.url) return false;
 const text=imageText(image);
 return PRODUCT_ONLY_WORDS.test(text) && !PEOPLE_WORDS.test(text);
}
function wideViewImage(product){
 const images=(product.images||[]).filter(image=>image?.url);
 if(!images.length) return null;

 const type=String(product.type||product.productType||'');
 if(/chain|accessor/i.test(type)) return images[1] || images[0];

 const explicit=images.find(explicitlyProductOnly);
 if(explicit) return explicit;

 const mappedIndex=WIDE_VIEW_IMAGE_INDEX[product.handle];
 if(Number.isInteger(mappedIndex) && images[mappedIndex]) return images[mappedIndex];

 const hasPeopleImage=images.some(image=>PEOPLE_WORDS.test(imageText(image)));
 if(!hasPeopleImage) return images[1] || images[0];

 return null;
}

export default function ProductCard({product,compact=false}) {
 const sizes=compact
  ? '(max-width:700px) 24vw,12vw'
  : '(max-width:700px) 45vw,23vw';
 const price=Number(product.price || 0),compareAt=Number(product.compareAtPrice || 0);
 const onSale=Number.isFinite(compareAt) && compareAt>price;
 const discount=onSale?Math.round(((compareAt-price)/compareAt)*100):0;
 const selectedImage=compact?wideViewImage(product):null;
 const imageSrc=compact ? (selectedImage?.url || '') : product.image;
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
