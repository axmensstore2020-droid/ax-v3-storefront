'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';
import Icon from './Icon';
import {readRecentlyViewed} from '../lib/recently-viewed';
import {trackStoreEvent} from '../lib/store-analytics';

export default function RecentlyViewed({excludeHandles=[],limit=4}){
  const [items,setItems]=useState([]);
  const excluded=useMemo(()=>new Set((excludeHandles||[]).filter(Boolean)),[excludeHandles]);

  useEffect(()=>{
    const handles=readRecentlyViewed().filter(handle=>!excluded.has(handle)).slice(0,Math.max(1,Math.min(8,limit)));
    if(!handles.length){setItems([]);return;}
    const controller=new AbortController();
    fetch('/api/recently-viewed?handles='+encodeURIComponent(handles.join(',')),{signal:controller.signal,cache:'no-store'})
      .then(response=>response.ok?response.json():{items:[]})
      .then(data=>setItems(Array.isArray(data?.items)?data.items:[]))
      .catch(error=>{if(error?.name!=='AbortError')setItems([]);});
    return()=>controller.abort();
  },[excluded,limit]);

  if(!items.length) return null;
  return <section className="section-wrap related-section recently-viewed-section" aria-labelledby="recently-viewed-title">
    <div className="section-head">
      <div><p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p><h2 id="recently-viewed-title" className="editorial">Recently viewed.</h2></div>
      <Link href="/products" className="underlined-link">EXPLORE ALL <Icon name="arrow"/></Link>
    </div>
    <div className="product-grid">
      {items.map(product=><div key={product.id||product.handle} onClick={()=>trackStoreEvent('recommendation_click',{productHandle:product.handle,metadata:{surface:'recently-viewed'}})}><ProductCard product={product}/></div>)}
    </div>
  </section>;
}
