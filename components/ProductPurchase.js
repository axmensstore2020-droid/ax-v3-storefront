'use client';
import {useEffect,useRef,useState} from 'react';
import AddToCart from './AddToCart';
import ProductImage from './ProductImage';
import ProductDataPanel from './ProductDataPanel';
import {StylistButton} from './StylistProvider';
import Icon from './Icon';
import {findVariant} from '../lib/commerce';
import {productMarketingData} from '../lib/marketing';
import {initialSelection,productOptions,selectionImage} from '../lib/product-variants';
import {trackMarketingEvent} from './MetaMarketing';
import {trackStoreEvent} from '../lib/store-analytics';
import {deliveryWeightForProduct} from '../lib/weight';
import ShippingEstimator from './ShippingEstimator';
import ProductProof from './ProductProof';

const PDP_WIDTHS=[320,480,600,720,800,960,1100,1200];

export default function ProductPurchase({product,initialVariantId,chooseSize=false,hasCompleteLook=false,children}) {
  const [selected,setSelected] = useState(() => initialSelection(product,initialVariantId,chooseSize));
  const galleryRef = useRef(null), trackedView = useRef('');
  const variant = findVariant(product.variants || [],selected);
  const primary = selectionImage(product,selected,variant);
  const deliveryWeight=deliveryWeightForProduct(product,selected,variant);
  const deliverySubtotal=Number(variant?.price?.amount ?? product.price ?? 0);
  const gallery = [...new Map([primary,...(product.images || [])].filter(image => image?.url).map(image => [image.url,image])).values()];
  useEffect(() => {galleryRef.current?.scrollTo({left:0,behavior:'instant'});},[primary?.url]);
  useEffect(()=>{
    if(product.demo || trackedView.current===product.handle)return;
    trackedView.current=product.handle;
    const marketing=productMarketingData(product,variant,1);
    trackMarketingEvent('ViewContent',marketing);
    trackStoreEvent('product_view',{productHandle:product.handle,value:marketing.value,currency:marketing.currency,metadata:{variantId:variant?.id || ''}});
  },[product,variant]);
  return <section className="pdp">
    <div ref={galleryRef} className={`pdp-gallery${gallery.length===1?' single-image':''}`} aria-label="Product photos">
      {gallery.map((image,index) => <div className="pdp-image" key={image.url}><ProductImage src={image.url} alt={image.altText || product.title+', view '+(index+1)} sizes="(max-width:700px) 94vw,50vw" widths={PDP_WIDTHS} fallbackWidth={index===0?800:720} eager={index===0}/></div>)}
    </div>
    <div className="pdp-info">
      <p className="eyebrow">{product.type || 'AX MENSWEAR'}</p><h1 className="editorial">{product.title}</h1>
      <AddToCart product={product} options={productOptions(product)} selected={selected} variant={variant} onSelect={(name,value) => {setSelected(current => ({...current,[name]:value}));trackStoreEvent('select_variant',{productHandle:product.handle,metadata:{option:name,value}});}} beforeAddButton={<ShippingEstimator weightGrams={deliveryWeight} productHandle={product.handle} subtotal={deliverySubtotal}/>}/>
      {hasCompleteLook && <a className="pdp-complete-look-link" href="#complete-look"><span>STYLE IT</span><strong>Complete the look</strong><Icon name="arrow" size={17}/></a>}
      {children}
      <ProductDataPanel product={product} selectedOptions={selected}/>
      <ProductProof product={product}/>
      <StylistButton className="underlined-link pdp-stylist" product={{title:product.title,handle:product.handle,selectedOptions:selected}}>STYLE WITH AX <Icon name="arrow"/></StylistButton>
    </div>
  </section>;
}
