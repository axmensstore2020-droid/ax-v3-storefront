'use client';
import {useEffect,useRef,useState} from 'react';
import AddToCart from './AddToCart';
import ProductImage from './ProductImage';
import ProductVideo from './ProductVideo';
import {productGallery} from '../lib/product-media';
import ProductDataPanel from './ProductDataPanel';
import {StylistButton} from './StylistProvider';
import Icon from './Icon';
import {findVariant} from '../lib/commerce';
import {productMarketingData} from '../lib/marketing';
import {initialSelection,productOptions,selectionAfterOption,selectionImage} from '../lib/product-variants';
import {trackMarketingEvent} from './MetaMarketing';
import {trackStoreEvent} from '../lib/store-analytics';
import {deliveryWeightForProduct} from '../lib/weight';
import ShippingEstimator from './ShippingEstimator';
import ProductProof from './ProductProof';
import {rememberRecentlyViewed} from '../lib/recently-viewed';
import WishlistButton from './WishlistButton';
import CompleteLook from './CompleteLook';
import ProductCard from './ProductCard';
import Link from 'next/link';

// PDP VARIANT STATE OWNER
// Keep size/colour selection centralized here so the gallery, price, shipping,
// Add to Bag, Complete the Look and Stylist all observe the same Shopify variant.
// If a variant bug appears, start here and in lib/product-variants.js.
const PDP_WIDTHS=[320,480,600,720,800,960,1100,1200];

export default function ProductPurchase({product,initialVariantId,chooseSize=false,restockAlertsEnabled=false,children,colourways=[],completeLookItems=[],afterProductInfo=null}) {
  const [selected,setSelected] = useState(() => initialSelection(product,initialVariantId,chooseSize));
  const [liveColourways,setLiveColourways] = useState(colourways);
  const [recommendations,setRecommendations] = useState(null);
  const [recommendationsLoading,setRecommendationsLoading] = useState(true);
  const galleryRef = useRef(null), trackedView = useRef(''), previousPrimary = useRef('');
  const variant = findVariant(product.variants || [],selected);
  const primary = selectionImage(product,selected,variant);
  const deliveryWeight=deliveryWeightForProduct(product,selected,variant);
  const deliverySubtotal=Number(variant?.price?.amount ?? product.price ?? 0);
  const gallery = productGallery(product,primary);
  useEffect(() => {
    const controller=new AbortController();
    fetch('/api/pdp-recommendations?handle='+encodeURIComponent(product.handle),{signal:controller.signal,cache:'no-store'})
      .then(response=>response.ok?response.json():Promise.reject(new Error('Recommendations unavailable')))
      .then(data=>{
        if(controller.signal.aborted)return;
        if(Array.isArray(data.colourways)&&data.colourways.length)setLiveColourways(data.colourways);
        setRecommendations(data);
      })
      .catch(error=>{if(error?.name!=='AbortError'&&!controller.signal.aborted)setRecommendations(null);})
      .finally(()=>{if(!controller.signal.aborted)setRecommendationsLoading(false);});
    return()=>controller.abort();
  },[product.handle]);
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
  return <>
    <section className="pdp">
    <div ref={galleryRef} className={`pdp-gallery${gallery.length===1?' single-image':''}`} aria-label="Product photos and videos">
      {gallery.map((media,index) => <div className="pdp-image" key={media.id || media.url}>{media.type==='video'
        ? <ProductVideo media={media} title={product.title}/>
        : <ProductImage src={media.url} alt={media.altText || product.title+', view '+(index+1)} sizes="(max-width:700px) 94vw,50vw" widths={PDP_WIDTHS} fallbackWidth={index===0?800:720} eager={index===0}/>}</div>)}
    </div>
    <div className="pdp-info">
      <p className="eyebrow">{product.type || 'AX MENSWEAR'}</p><div className="pdp-title-row"><h1 className="editorial">{product.title}</h1><WishlistButton handle={product.handle} className="pdp-wishlist" showLabel/></div>
      <AddToCart product={product} options={productOptions(product)} selected={selected} variant={variant} colourways={liveColourways.length?liveColourways:colourways} onSelect={(name,value) => {setSelected(current => selectionAfterOption(product.variants || [],current,name,value));trackStoreEvent('select_variant',{productHandle:product.handle,metadata:{option:name,value}});}} afterAddButton={<ShippingEstimator weightGrams={deliveryWeight} productHandle={product.handle} subtotal={deliverySubtotal}/>} restockAlertsEnabled={restockAlertsEnabled}/>
      {children}
      <ProductDataPanel product={product} selectedOptions={selected}/>
      <div className="pdp-after-product-info">
        {recommendations?.completeLook?.length>0
          ? <CompleteLook product={product} mainVariant={variant} mainSelection={selected} items={recommendations.completeLook}/>
          : <section id="complete-look" className="complete-look section-wrap" aria-labelledby="complete-look-title" aria-busy={recommendationsLoading}>
              <div className="section-head"><div><p className="eyebrow">PAIR WITH THIS PIECE</p><h2 id="complete-look-title" className="editorial">Complete the look.</h2></div><p className="muted small">{recommendationsLoading?'Finding purchasable pieces to pair with this item.':'Complete the Look only shows pieces that can be added to your bag.'}</p></div>
              {!recommendationsLoading && <p className="muted small">{recommendations?.preview?.length?'Product options are temporarily unavailable. ':'More pieces are being added to the store. '}<Link href="/products">Explore all products →</Link></p>}
            </section>}
      </div>
      {afterProductInfo && <div className="pdp-after-product-info">{afterProductInfo}</div>}
      <ProductProof product={product}/>
      <StylistButton className="underlined-link pdp-stylist" product={{title:product.title,handle:product.handle,selectedOptions:selected}}>STYLE WITH AX <Icon name="arrow"/></StylistButton>
    </div>
    </section>
    {recommendations?.related?.length>0 && <section className="section-wrap related-section"><div className="section-head"><h2 className="editorial">More to make your own.</h2><Link href="/products" className="underlined-link">EXPLORE ALL <Icon name="arrow"/></Link></div><div className="product-grid">{recommendations.related.map(item=><ProductCard key={item.handle} product={item}/>)}</div></section>}
  </>;
}
