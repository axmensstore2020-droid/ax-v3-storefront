'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import Icon from './Icon';
import {readWishlist,WISHLIST_EVENT,WISHLIST_KEY} from '../lib/wishlist';

export default function WishlistNavLink(){
  const [count,setCount]=useState(0);
  useEffect(()=>{
    const sync=()=>setCount(readWishlist().length);
    sync();
    const onStorage=event=>{if(!event || event.key===WISHLIST_KEY)sync();};
    window.addEventListener(WISHLIST_EVENT,sync);
    window.addEventListener('storage',onStorage);
    return()=>{window.removeEventListener(WISHLIST_EVENT,sync);window.removeEventListener('storage',onStorage);};
  },[]);
  return <Link className="header-saved" href="/wishlist" aria-label={'Saved items, '+count}>
    <Icon name="heart" size={18}/><span>{count?'SAVED ('+count+')':'SAVED'}</span>
  </Link>;
}
