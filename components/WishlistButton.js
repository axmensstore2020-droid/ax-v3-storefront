'use client';
import {useEffect,useState} from 'react';
import Icon from './Icon';
import {readWishlist,toggleWishlist,WISHLIST_EVENT,WISHLIST_KEY,wishlistHas} from '../lib/wishlist';

export default function WishlistButton({handle,className='',showLabel=false}){
  const [saved,setSaved]=useState(false);
  useEffect(()=>{
    const sync=()=>setSaved(wishlistHas(readWishlist(),handle));
    sync();
    const onStorage=event=>{if(!event || event.key===WISHLIST_KEY)sync();};
    window.addEventListener(WISHLIST_EVENT,sync);
    window.addEventListener('storage',onStorage);
    return()=>{window.removeEventListener(WISHLIST_EVENT,sync);window.removeEventListener('storage',onStorage);};
  },[handle]);

  function onToggle(event){
    event.preventDefault();
    event.stopPropagation();
    const next=toggleWishlist(handle);
    setSaved(wishlistHas(next,handle));
  }

  const label=saved?'Remove from saved':'Save for later';
  return <button type="button" className={'wishlist-button '+(saved?'saved ':'')+className} aria-label={label} aria-pressed={saved} onClick={onToggle}>
    <Icon name="heart" size={18}/>
    {showLabel&&<span>{saved?'SAVED':'SAVE FOR LATER'}</span>}
  </button>;
}
