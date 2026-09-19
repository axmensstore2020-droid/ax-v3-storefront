'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import ProductImage from './ProductImage';
import {formatMoney} from '../lib/catalog';
import {trackStoreEvent} from '../lib/store-analytics';

export default function CartRecommendations({handles=[],onNavigate}){
  const [items,setItems]=useState([]);
  const key=useMemo(()=>[...new Set(handles.filter(Boolean))].sort().join(','),[handles]);

  useEffect(()=>{
    if(!key){setItems([]);return;}
    const controller=new AbortController();
    fetch('/api/cart/recommendations?handles='+encodeURIComponent(key),{signal:controller.signal,cache:'no-store'})
      .then(response=>response.ok?response.json():{items:[]})
      .then(data=>setItems(Array.isArray(data?.items)?data.items:[]))
      .catch(error=>{if(error?.name!=='AbortError')setItems([]);});
    return()=>controller.abort();
  },[key]);

  if(!items.length)return null;
  function visit(product){
    trackStoreEvent('recommendation_click',{productHandle:product.handle,metadata:{surface:'cart-complete-look'}});
    onNavigate?.();
  }
  return <section className="cart-recommendations" aria-labelledby="cart-complete-look-title">
    <div className="cart-recommendations-head">
      <span>STYLE IT</span>
      <strong id="cart-complete-look-title">Complete the look</strong>
    </div>
    <div className="cart-recommendations-track">
      {items.map(product=><article className="cart-recommendation" key={product.id||product.handle}>
        <Link className="cart-recommendation-image" href={'/products/'+product.handle} onClick={()=>visit(product)}>
          <ProductImage src={product.image} alt={product.imageAlt||product.title} sizes="132px" widths={[120,160,200,240,280]} fallbackWidth={200}/>
        </Link>
        <div className="cart-recommendation-copy">
          <Link href={'/products/'+product.handle} onClick={()=>visit(product)}>{product.title}</Link>
          <p>{formatMoney(product.price,product.currency)}</p>
          <Link className="cart-recommendation-view" href={'/products/'+product.handle} onClick={()=>visit(product)}>VIEW →</Link>
        </div>
      </article>)}
    </div>
  </section>;
}
