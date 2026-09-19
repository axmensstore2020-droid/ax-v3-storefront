'use client';
import Link from 'next/link';
import {useCart} from './CartProvider';
import {formatMoney} from '../lib/catalog';
import {checkoutMarketingData} from '../lib/marketing';
import Dialog from './Dialog';
import ProductImage from './ProductImage';
import ShippingEstimator from './ShippingEstimator';
import {cartLineDetails,variantHref} from '../lib/product-variants';
import {trackMarketingEvent} from './MetaMarketing';
import {trackStoreEvent} from '../lib/store-analytics';

export default function CartDrawer(){
 const {cart,demoLines,demo,open,setOpen,busy,notice,updateItem,freeShippingThreshold}=useCart();if(!open)return null;
 const lines=demo?demoLines.map(line=>({id:line.key,merchandiseId:line.variant?.id,quantity:line.quantity,title:line.product.title,handle:line.product.handle,href:variantHref(line.product.handle,line.variant?.id),image:line.variant?.image?.url||line.product.image,variant:line.variant?.selectedOptions?.map(option=>option.name+': '+option.value).join(' · '),unitPrice:Number(line.variant?.price?.amount||line.product.price),amount:Number(line.variant?.price?.amount||line.product.price)*line.quantity,currency:line.variant?.price?.currencyCode||'INR',weightGrams:null,requiresShipping:true})):(cart?.lines?.nodes||[]).map(cartLineDetails);
 const subtotal=demo?lines.reduce((sum,line)=>sum+line.amount,0):Number(cart?.cost?.subtotalAmount?.amount||0),currency=cart?.cost?.subtotalAmount?.currencyCode||lines[0]?.currency||'INR';
 const checkoutData=checkoutMarketingData(lines,subtotal,currency);
 const shippable=lines.filter(line=>line.requiresShipping!==false);
 const hasWeights=shippable.length>0&&shippable.every(line=>Number.isFinite(Number(line.weightGrams))&&Number(line.weightGrams)>0);
 const weightGrams=hasWeights?shippable.reduce((sum,line)=>sum+Number(line.weightGrams)*line.quantity,0):null;
 const threshold=Number(freeShippingThreshold||0),remaining=threshold>0?Math.max(0,threshold-subtotal):0,progress=threshold>0?Math.max(0,Math.min(100,(subtotal/threshold)*100)):0;
 function beginCheckout(){trackMarketingEvent('InitiateCheckout',checkoutData);trackStoreEvent('begin_checkout',{value:subtotal,currency,metadata:{items:lines.reduce((sum,line)=>sum+line.quantity,0)}});}
 return <Dialog title="Your bag" className="cart-dialog" onClose={()=>setOpen(false)}>
  {demo&&<p className="cart-notice">You’re browsing a store preview. These sample pieces can’t be purchased yet.</p>}
  {notice&&<p className="cart-notice" role="alert">{notice}</p>}
  {!lines.length&&<div className="empty-cart"><h3 className="editorial">Room for something new.</h3><p>Your bag is empty.</p><Link className="underlined-link" href="/products" onClick={()=>setOpen(false)}>EXPLORE AX →</Link></div>}
  <div className="cart-lines">{lines.map(line=><div className="cart-line" key={line.id}><Link className="cart-image" href={line.href} onClick={()=>setOpen(false)}><ProductImage src={line.image} alt={line.title} sizes="76px"/></Link><div><Link className="cart-line-title" href={line.href} onClick={()=>setOpen(false)}>{line.title}</Link>{line.variant&&<p className="muted">{line.variant}</p>}<p>{formatMoney(line.amount,line.currency)}</p><div className="cart-line-bottom"><div className="quantity"><button aria-label={`Decrease ${line.title} quantity`} disabled={busy} onClick={()=>updateItem(line.id,line.quantity-1)}>−</button><span aria-live="polite">{line.quantity}</span><button aria-label={`Increase ${line.title} quantity`} disabled={busy||line.quantity>=99} onClick={()=>updateItem(line.id,line.quantity+1)}>+</button></div><button className="remove-item" disabled={busy} onClick={()=>updateItem(line.id,0)}>Remove</button></div></div></div>)}</div>
  {lines.length>0&&<>
   {threshold>0&&<div className="shipping-progress"><div><span style={{width:progress+'%'}}/></div><p>{remaining>0?<><strong>{formatMoney(remaining,currency)}</strong> away from free standard delivery.</>:<strong>Free standard delivery unlocked.</strong>}</p></div>}
   {!demo&&<ShippingEstimator weightGrams={weightGrams} className="cart-shipping-estimator" subtotal={subtotal} compact/>}
   <div className="cart-total"><span>Subtotal</span><strong>{formatMoney(subtotal,currency)}</strong></div>
   {demo?<button className="checkout-button" disabled>PREVIEW · CHECKOUT UNAVAILABLE</button>:busy?<button className="checkout-button" disabled>UPDATING BAG…</button>:<a className="checkout-button" href={cart.checkoutUrl} onClick={beginCheckout}>CONTINUE TO CHECKOUT</a>}
   <p className="cart-note">Live delivery options are confirmed again at checkout.</p>
  </>}
 </Dialog>;
}
