'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';
import Icon from './Icon';
import {readWishlist,WISHLIST_EVENT,WISHLIST_KEY} from '../lib/wishlist';

export default function WishlistPageClient(){
  const [handles,setHandles]=useState([]),[items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);

  useEffect(()=>{
    const sync=()=>setHandles(readWishlist());
    sync();
    const onStorage=event=>{if(!event || event.key===WISHLIST_KEY)sync();};
    window.addEventListener(WISHLIST_EVENT,sync);
    window.addEventListener('storage',onStorage);
    return()=>{window.removeEventListener(WISHLIST_EVENT,sync);window.removeEventListener('storage',onStorage);};
  },[]);

  const key=handles.join(',');
  useEffect(()=>{
    if(!key){setItems([]);setLoading(false);setError('');return;}
    const controller=new AbortController();
    setLoading(true);setError('');
    fetch('/api/wishlist?handles='+encodeURIComponent(key),{signal:controller.signal,cache:'no-store'})
      .then(async response=>{if(!response.ok)throw new Error('Saved items are temporarily unavailable.');return response.json();})
      .then(data=>setItems(Array.isArray(data?.items)?data.items:[]))
      .catch(err=>{if(err?.name!=='AbortError')setError(err.message||'Saved items are temporarily unavailable.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[key,retry]);

  return <main id="main-content" className="wishlist-page">
    <header className="wishlist-hero">
      <div><p className="eyebrow">YOUR AX EDIT</p><h1 className="editorial">Saved pieces.</h1></div>
      <span>{handles.length ? handles.length+' SAVED' : ''}</span>
    </header>
    {loading&&<p className="wishlist-status" role="status">Loading your saved pieces…</p>}
    {error&&<div className="wishlist-empty" role="alert"><h2 className="editorial">We couldn’t load your saved pieces.</h2><p>{error}</p><button className="underlined-link" type="button" onClick={()=>setRetry(value=>value+1)}>TRY AGAIN <Icon name="arrow"/></button></div>}
    {!loading&&!error&&!handles.length&&<div className="wishlist-empty"><h2 className="editorial">Nothing saved yet.</h2><p>Tap the heart on any piece you want to come back to.</p><Link className="underlined-link" href="/products">EXPLORE THE COLLECTION <Icon name="arrow"/></Link></div>}
    {!loading&&!error&&handles.length>0&&items.length>0&&<section className="product-grid wishlist-grid" aria-label="Saved products">{items.map(product=><ProductCard key={product.id||product.handle} product={product}/>)}</section>}
    {!loading&&!error&&handles.length>0&&!items.length&&<div className="wishlist-empty"><h2 className="editorial">Your saved pieces aren’t available right now.</h2><p>They may have been removed from the current catalog.</p><Link className="underlined-link" href="/products">EXPLORE NEW IN <Icon name="arrow"/></Link></div>}
  </main>;
}
