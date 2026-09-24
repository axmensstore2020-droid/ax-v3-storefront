'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useCart} from './CartProvider';
import {formatMoney} from '../lib/catalog';
import {checkoutMarketingData} from '../lib/marketing';
import Dialog from './Dialog';
import ProductImage from './ProductImage';
import {cartLineDetails,variantHref} from '../lib/product-variants';
import {trackMarketingEvent} from './MetaMarketing';
import {trackStoreEvent} from '../lib/store-analytics';
import {partialCodHandlingFee} from '../lib/partial-cod';
import CartRecommendations from './CartRecommendations';
import {requestMotionScan} from '../lib/motion-scan';

const PIN_KEY='ax_delivery_pincode';

export default function CartDrawer(){
 const {cart,demoLines,demo,open,setOpen,checkoutIntent,busy,notice,updateItem,freeShippingThreshold,partialCodEnabled}=useCart();
 const checkoutRef=useRef(null);
 const [codPincode,setCodPincode]=useState(''),[codState,setCodState]=useState('idle'),[codMessage,setCodMessage]=useState(''),[codBusy,setCodBusy]=useState(false);

 useEffect(()=>{
  if(!open || !checkoutIntent || busy) return;
  const frame=requestAnimationFrame(()=>{
   checkoutRef.current?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
   checkoutRef.current?.focus?.({preventScroll:true});
  });
  return()=>cancelAnimationFrame(frame);
 },[open,checkoutIntent,busy,cart?.id]);

 useEffect(()=>{
  if(open) requestMotionScan(checkoutRef.current?.closest?.('dialog') || document);
 },[open,cart?.totalQuantity,notice,codState,checkoutIntent,busy]);

 useEffect(()=>{
  if(!open || !partialCodEnabled) return;
  try{
   const saved=localStorage.getItem(PIN_KEY);
   if(/^\d{6}$/.test(saved||'')){
    setCodPincode(saved);
    checkCodAvailability(saved,true);
   }
  }catch{}
 },[open,partialCodEnabled]);

 if(!open)return null;
 const lines=demo?demoLines.map(line=>({id:line.key,merchandiseId:line.variant?.id,quantity:line.quantity,title:line.product.title,handle:line.product.handle,href:variantHref(line.product.handle,line.variant?.id),image:line.variant?.image?.url||line.product.image,variant:line.variant?.selectedOptions?.map(option=>option.name+': '+option.value).join(' · '),unitPrice:Number(line.variant?.price?.amount||line.product.price),amount:Number(line.variant?.price?.amount||line.product.price)*line.quantity,currency:line.variant?.price?.currencyCode||'INR',weightGrams:null,requiresShipping:true})):(cart?.lines?.nodes||[]).map(cartLineDetails);
 const subtotal=demo?lines.reduce((sum,line)=>sum+line.amount,0):Number(cart?.cost?.subtotalAmount?.amount||0),currency=cart?.cost?.subtotalAmount?.currencyCode||lines[0]?.currency||'INR';
 const checkoutData=checkoutMarketingData(lines,subtotal,currency);
 const codHandlingFee=partialCodEnabled?partialCodHandlingFee(subtotal):0;
 const threshold=Number(freeShippingThreshold||0),remaining=threshold>0?Math.max(0,threshold-subtotal):0,progress=threshold>0?Math.max(0,Math.min(100,(subtotal/threshold)*100)):0;
 function beginCheckout(){trackMarketingEvent('InitiateCheckout',checkoutData);trackStoreEvent('begin_checkout',{value:subtotal,currency,metadata:{items:lines.reduce((sum,line)=>sum+line.quantity,0)}});}
 async function checkCodAvailability(value=codPincode,silent=false){
  const pin=String(value||'').replace(/\D/g,'').slice(0,6);
  if(!/^\d{6}$/.test(pin)){setCodState('idle');setCodMessage('Enter a valid 6-digit pincode.');return;}
  setCodBusy(true);setCodState('checking');if(!silent)setCodMessage('');
  try{
   const response=await fetch('/api/partial-cod/serviceability',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pincode:pin})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok || !data.ok) throw new Error(data.error || 'COD availability could not be checked.');
   try{localStorage.setItem(PIN_KEY,pin);}catch{}
   if(data.codAvailable){setCodState('available');setCodMessage('COD available for '+pin+'.');}
   else if(data.deliveryAvailable){setCodState('unavailable');setCodMessage('COD is not available for '+pin+'. Please pay online.');}
   else {setCodState('unavailable');setCodMessage('Delivery is currently unavailable for '+pin+'.');}
  }catch(error){setCodState('error');setCodMessage(error.message || 'COD availability could not be checked.');}
  finally{setCodBusy(false);}
 }
 function updateCodPincode(event){
  const pin=event.target.value.replace(/\D/g,'').slice(0,6);
  setCodPincode(pin);setCodState('idle');setCodMessage('');
 }
 return <Dialog title="Your bag" className="cart-dialog" onClose={()=>setOpen(false)}>
  {demo&&<p className="cart-notice">You’re browsing a store preview. These sample pieces can’t be purchased yet.</p>}
  {notice&&<p className="cart-notice" role="alert">{notice}</p>}
  {!lines.length&&<div className="empty-cart"><h3 className="editorial">Room for something new.</h3><p>Your bag is empty.</p><Link className="underlined-link" href="/products" onClick={()=>setOpen(false)}>EXPLORE AX →</Link></div>}
  <div className="cart-lines">{lines.map(line=><div className="cart-line" data-cart-line key={line.id}><Link className="cart-image" href={line.href} onClick={()=>setOpen(false)}><ProductImage src={line.image} alt={line.title} sizes="76px"/></Link><div><Link className="cart-line-title" href={line.href} onClick={()=>setOpen(false)}>{line.title}</Link>{line.variant&&<p className="muted">{line.variant}</p>}<p>{formatMoney(line.amount,line.currency)}</p><div className="cart-line-bottom"><div className="quantity"><button aria-label={`Decrease ${line.title} quantity`} disabled={busy} onClick={()=>updateItem(line.id,line.quantity-1)}>−</button><span key={line.quantity} className="cart-quantity-value" aria-live="polite">{line.quantity}</span><button aria-label={`Increase ${line.title} quantity`} disabled={busy||line.quantity>=99} onClick={()=>updateItem(line.id,line.quantity+1)}>+</button></div><button className="remove-item" disabled={busy} onClick={()=>updateItem(line.id,0)}>Remove</button></div></div></div>)}</div>
  {lines.length>0&&<>
   {threshold>0&&<div className="shipping-progress"><div><span style={{width:progress+'%'}}/></div><p>{remaining>0?<><strong>{formatMoney(remaining,currency)}</strong> away from free standard delivery.</>:<strong>Free standard delivery unlocked.</strong>}</p></div>}
   {!demo&&<CartRecommendations handles={lines.map(line=>line.handle)} onNavigate={()=>setOpen(false)}/>}
   <div className="cart-total"><span>Subtotal</span><strong>{formatMoney(subtotal,currency)}</strong></div>
   {demo?<button className="checkout-button" disabled>PREVIEW · CHECKOUT UNAVAILABLE</button>:busy?<button className="checkout-button" disabled>UPDATING BAG…</button>:<div ref={checkoutRef} tabIndex={-1} className={`checkout-methods${checkoutIntent?' quick-checkout':''}`} aria-label="Checkout payment options">{checkoutIntent&&<p className="checkout-intent-note" role="status">Buy now · choose your payment method.</p>}<a className="checkout-button" href={cart.checkoutUrl} onClick={beginCheckout}>PAY ONLINE</a>{partialCodEnabled&&<div className="partial-cod-gate"><div className="partial-cod-option-head"><strong>PARTIAL COD</strong><span>COD handling {formatMoney(codHandlingFee,currency)}</span></div><p className="partial-cod-option-copy">Check your pincode first. Full address is only needed after COD is available.</p><form className="partial-cod-pincode-form" onSubmit={event=>{event.preventDefault();checkCodAvailability();}}><input aria-label="Delivery pincode for COD" inputMode="numeric" autoComplete="postal-code" maxLength="6" pattern="[0-9]{6}" placeholder="6-digit pincode" value={codPincode} onChange={updateCodPincode}/><button type="submit" disabled={codBusy||codPincode.length!==6}>{codBusy?'CHECKING…':'CHECK COD'}</button></form>{codMessage&&<p className={'partial-cod-status '+codState} role="status">{codMessage}</p>}{codState==='available'&&<Link className="partial-cod-continue" href="/partial-cod" onClick={()=>{beginCheckout();setOpen(false);}}>CONTINUE WITH PARTIAL COD</Link>}<small>₹40 minimum · 2% of product value above ₹2,000</small></div>}</div>}
  </>}
 </Dialog>;
}
