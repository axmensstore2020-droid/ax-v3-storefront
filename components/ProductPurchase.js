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
import {rememberRecentlyViewed} from '../lib/recently-viewed';
import WishlistButton from './WishlistButton';
import CompleteLook from './CompleteLook';

const PDP_WIDTHS=[320,480,600,720,800,960,1100,1200];

export default function ProductPurchase({product,initialVariantId,chooseSize=false,restockAlertsEnabled=false,children,colourways=[],completeLookItems=[],afterProductInfo=null}) {
  const [selected,setSelected] = useState(() => initialSelection(product,initialVariantId,chooseSize));
  const galleryRef = useRef(null), trackedView = useRef(''), previousPrimary = useRef('');
  const variant = findVariant(product.variants || [],selected);
  const primary = selectionImage(product,selected,variant);
  const deliveryWeight=deliveryWeightForProduct(product,selected,variant);
  const deliverySubtotal=Number(variant?.price?.amount ?? product.price ?? 0);
  const gallery = [...new Map([primary,...(product.images || [])].filter(image => image?.url).map(image => [image.url,image])).values()];
  useEffect(() => {
    galleryRef.current?.scrollTo({left:0,behavior:'auto'});
    const next=primary?.url || '';
    const previous=previousPrimary.current;
    previousPrimary.current=next;
    if(!previous || !next || previous===next) return;
    const frame=requestAnimationFrame(()=>window.dispatchEvent(new CustomEvent('ax:gallery-primary-change',{detail:{gallery:galleryRef.current}})));
    return()=>cancelAnimationFrame(frame);
  },[primary?.url]);
  useEffect(()=>{
    if(!product.demo) rememberRecentlyViewed(product.handle);
  },[product.demo,product.handle]);
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
      <p className="eyebrow">{product.type || 'AX MENSWEAR'}</p><div className="pdp-title-row"><h1 className="editorial">{product.title}</h1><WishlistButton handle={product.handle} className="pdp-wishlist" showLabel/></div>
      <AddToCart product={product} options={productOptions(product)} selected={selected} variant={variant} colourways={colourways} onSelect={(name,value) => {setSelected(current => ({...current,[name]:value}));trackStoreEvent('select_variant',{productHandle:product.handle,metadata:{option:name,value}});}} afterAddButton={<ShippingEstimator weightGrams={deliveryWeight} productHandle={product.handle} subtotal={deliverySubtotal}/>} restockAlertsEnabled={restockAlertsEnabled}/>
      {children}
      <ProductDataPanel product={product} selectedOptions={selected}/>
      {completeLookItems.length>0 && <div className="pdp-after-product-info"><CompleteLook product={product} mainVariant={variant} mainSelection={selected} items={completeLookItems}/></div>}
      {afterProductInfo && <div className="pdp-after-product-info">{afterProductInfo}</div>}
      <ProductProof product={product}/>
      <StylistButton className="underlined-link pdp-stylist" product={{title:product.title,handle:product.handle,selectedOptions:selected}}>STYLE WITH AX <Icon name="arrow"/></StylistButton>
    </div>
  </section>;
}
