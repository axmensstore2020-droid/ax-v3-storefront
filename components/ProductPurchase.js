'use client';
import {useEffect,useRef,useState} from 'react';
import AddToCart from './AddToCart';
import ProductImage from './ProductImage';
import {StylistButton} from './StylistProvider';
import Icon from './Icon';
import {findVariant} from '../lib/commerce';
import {initialSelection,productOptions,selectionImage} from '../lib/product-variants';

export default function ProductPurchase({product,initialVariantId,chooseSize=false,children}) {
  const [selected,setSelected] = useState(() => initialSelection(product,initialVariantId,chooseSize));
  const galleryRef = useRef(null);
  const variant = findVariant(product.variants || [],selected);
  const primary = selectionImage(product,selected,variant);
  const gallery = [...new Map([primary,...(product.images || [])].filter(image => image?.url).map(image => [image.url,image])).values()];
  useEffect(() => {galleryRef.current?.scrollTo({left:0,behavior:'instant'});},[primary?.url]);
  return <section className="pdp">
    <div ref={galleryRef} className={`pdp-gallery${gallery.length===1?' single-image':''}`} aria-label="Product photos">
      {gallery.map((image,index) => <div className="pdp-image" key={image.url}><ProductImage src={image.url} alt={image.altText || product.title+', view '+(index+1)} sizes="(max-width:700px) 100vw,56vw" eager={index===0}/></div>)}
    </div>
    <div className="pdp-info">
      <p className="eyebrow">{product.type || 'AX MENSWEAR'}</p><h1 className="editorial">{product.title}</h1>
      <AddToCart product={product} options={productOptions(product)} selected={selected} variant={variant} onSelect={(name,value) => setSelected(current => ({...current,[name]:value}))}/>
      {children}
      <StylistButton className="underlined-link pdp-stylist" product={{title:product.title,handle:product.handle,selectedOptions:selected}}>STYLE WITH AX <Icon name="arrow"/></StylistButton>
    </div>
  </section>;
}
