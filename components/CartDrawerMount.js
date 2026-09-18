'use client';
import dynamic from 'next/dynamic';
import {useCart} from './CartProvider';

const CartDrawer=dynamic(()=>import('./CartDrawer'),{ssr:false});

export default function CartDrawerMount(){
 const {open}=useCart();
 return open ? <CartDrawer/> : null;
}
