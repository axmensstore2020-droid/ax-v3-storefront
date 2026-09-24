'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import {formatMoney} from '../lib/catalog';
import ProductImage from './ProductImage';
import WishlistButton from './WishlistButton';

const GRID_WIDTHS=[180,240,280,320,360,400,480,560,640];
const COMPACT_WIDTHS=[120,160,200,240,280,320,400];
const PEOPLE_WORDS=/\b(model|human|person|man|men|male|wearing|worn|styled|outfit|lookbook|on[-_ ]?model)\b/i;
const PRODUCT_ONLY_WORDS=/\b(wide[-_ ]?view|product[-_ ]?only|flat(?:[-_ ]?lay)?|flatlay|garment[-_ ]?only|packshot|isolated|no[-_ ]?model|hanger|hanging|mannequin|dummy|torso|dress[-_ ]?form)\b/i;

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
function galleryImages(product){
 const seen=new Set(),items=[];
 const source=[
  product.image?{url:product.image,altText:product.imageAlt||product.title}:null,
  ...(product.images||[])
 ];
 for(const image of source){
  if(!image?.url || seen.has(image.url)) continue;
  seen.add(image.url);items.push(image);
  if(items.length>=8) break;
 }
 return items;
}

export default function ProductCard({product,compact=false}) {
 const sizes=compact?'(max-width:700px) 24vw,12vw':'(max-width:700px) 45vw,23vw';
 const price=Number(product.price || 0),compareAt=Number(product.compareAtPrice || 0);
 const onSale=Number.isFinite(compareAt) && compareAt>price;
 const discount=onSale?Math.round(((compareAt-price)/compareAt)*100):0;
 const selectedImage=compact?wideViewImage(product):null;
 const imageSrc=compact ? (selectedImage?.url || '') : product.image;
 const imageAlt=selectedImage?.altText || product.imageAlt || product.title;
 const gallery=compact?[]:galleryImages(product);
 const [activeImage,setActiveImage]=useState(0);
 const galleryRef=useRef(null),dragged=useRef(false),pointerStart=useRef({x:0,scrollLeft:0});

 function onGalleryScroll(event){
  const node=event.currentTarget,width=node.clientWidth;
  if(!width)return;
  const next=Math.max(0,Math.min(gallery.length-1,Math.round(node.scrollLeft/width)));
  setActiveImage(current=>current===next?current:next);
 }
 function onPointerDown(event){
  dragged.current=false;
  pointerStart.current={x:event.clientX,scrollLeft:event.currentTarget.scrollLeft};
  if(event.pointerType==='mouse') event.currentTarget.setPointerCapture?.(event.pointerId);
 }
 function onPointerMove(event){
  const dx=event.clientX-pointerStart.current.x;
  if(Math.abs(dx)>6)dragged.current=true;
  if(event.pointerType==='mouse' && event.buttons===1){
   event.preventDefault();
   event.currentTarget.scrollLeft=pointerStart.current.scrollLeft-dx;
  }
 }
 function onGalleryClick(event){
  if(!dragged.current)return;
  event.preventDefault();event.stopPropagation();dragged.current=false;
 }
 function moveGallery(direction){
  const node=galleryRef.current;
  if(!node)return;
  node.scrollBy({left:direction*node.clientWidth,behavior:'smooth'});
 }

 return <article className={`product-card${compact?' compact':''}`}>
  {!compact&&<WishlistButton handle={product.handle} className="product-card-wishlist"/>}
  {compact?
   <Link className="product-image-wrap" href={`/products/${product.handle}`} aria-label={`${product.title}, ${formatMoney(product.price,product.currency)}`}>
    <ProductImage src={imageSrc} alt={imageAlt} sizes={sizes} widths={COMPACT_WIDTHS} fallbackWidth={320}/>
   </Link>
   :
   <div className="product-card-gallery-shell">
    <Link ref={galleryRef} className="product-image-wrap product-card-gallery" href={`/products/${product.handle}`} aria-label={`${product.title}, ${formatMoney(product.price,product.currency)}. Swipe to view images.`} onScroll={onGalleryScroll} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onClick={onGalleryClick}>
     {(gallery.length?gallery:[{url:product.image,altText:imageAlt}]).map((image,index)=><span className="product-card-slide" key={image.url||index}><ProductImage src={image.url} alt={image.altText||`${product.title}, image ${index+1}`} sizes={sizes} widths={GRID_WIDTHS} fallbackWidth={480}/></span>)}
    </Link>
    {gallery.length>1&&<>
     <button className="product-card-gallery-arrow prev" type="button" aria-label={`Previous image of ${product.title}`} onClick={()=>moveGallery(-1)}>‹</button>
     <button className="product-card-gallery-arrow next" type="button" aria-label={`Next image of ${product.title}`} onClick={()=>moveGallery(1)}>›</button>
     <div className="product-card-gallery-dots" aria-hidden="true">{gallery.map((_,index)=><span className={index===activeImage?'active':''} key={index}/>)}</div>
    </>}
   </div>}
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
