'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {useCart} from './CartProvider';
import {formatMoney} from '../lib/catalog';

const emptyForm={firstName:'',lastName:'',email:'',phone:'',address1:'',address2:'',city:'',pincode:''};

async function api(path,body) {
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok || !data.ok) throw new Error(data.error || 'Partial COD is temporarily unavailable.');
  return data;
}

function loadRazorpay() {
  if(typeof window==='undefined') return Promise.reject(new Error('Payment checkout is unavailable.'));
  if(window.Razorpay) return Promise.resolve(window.Razorpay);
  return new Promise((resolve,reject)=>{
    const id='ax-razorpay-checkout',existing=document.getElementById(id);
    const ready=()=>window.Razorpay?resolve(window.Razorpay):reject(new Error('Razorpay checkout could not be loaded.'));
    if(existing){existing.addEventListener('load',ready,{once:true});existing.addEventListener('error',()=>reject(new Error('Razorpay checkout could not be loaded.')),{once:true});return;}
    const script=document.createElement('script');script.id=id;script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;
    script.onload=ready;script.onerror=()=>reject(new Error('Razorpay checkout could not be loaded.'));
    document.body.appendChild(script);
  });
}

export default function PartialCodCheckout(){
  const {cart,busy:cartBusy,clearCart}=useCart();
  const [form,setForm]=useState(emptyForm),[quote,setQuote]=useState(null),[shippingCode,setShippingCode]=useState('');
  const [accepted,setAccepted]=useState(false),[stage,setStage]=useState(''),[error,setError]=useState(''),[success,setSuccess]=useState(null),[pending,setPending]=useState(null);
  const selected=useMemo(()=>quote?.rates?.find(rate=>rate.code===shippingCode)||null,[quote,shippingCode]);
  const cartId=cart?.id || '';

  function update(event){
    const {name,value}=event.target;
    setForm(current=>({...current,[name]:value}));
    if(name==='pincode'){setQuote(null);setShippingCode('');}
  }

  async function checkCod(event){
    event.preventDefault();setError('');setStage('quote');
    try{
      if(!cartId) throw new Error('Your bag is empty or still loading.');
      const data=await api('/api/partial-cod/quote',{cartId,pincode:form.pincode});
      setQuote(data);
      const first=data.rates?.[0]?.code || '';
      setShippingCode(first);
      if(!form.city && data.location?.city) setForm(current=>({...current,city:data.location.city}));
    }catch(err){setQuote(null);setShippingCode('');setError(err.message);}
    finally{setStage('');}
  }

  async function confirmPayment(prepared,response){
    setStage('confirm');setError('');
    try{
      const result=await api('/api/partial-cod/confirm',{
        sessionToken:prepared.session,
        razorpayOrderId:response.razorpay_order_id,
        razorpayPaymentId:response.razorpay_payment_id,
        razorpaySignature:response.razorpay_signature
      });
      clearCart();
      setSuccess({...result,paymentId:response.razorpay_payment_id});
    }catch(err){
      setError((err.message || 'Your payment was received but the order could not be finalized.')+' Do not pay again. Razorpay reference: '+response.razorpay_payment_id+'. Retry order confirmation below or contact AX with this reference.');
    }finally{setStage('');}
  }

  async function payAdvance(){
    setError('');
    if(!selected) return setError('Choose a delivery method.');
    if(!accepted) return setError('Please accept the Partial COD terms before paying the advance.');
    if(!cartId) return setError('Your bag is empty or has expired.');
    setStage('prepare');
    try{
      const prepared=await api('/api/partial-cod/prepare',{
        cartId,pincode:form.pincode,shippingCode:selected.code,
        customer:{
          firstName:form.firstName,lastName:form.lastName,email:form.email,phone:form.phone,
          address1:form.address1,address2:form.address2,city:form.city
        }
      });
      const Razorpay=await loadRazorpay();
      setStage('');
      const checkout=new Razorpay({
        key:prepared.keyId,amount:prepared.amountPaise,currency:prepared.currency,
        name:"AX Men's Store",description:'Partial COD booking advance',order_id:prepared.orderId,
        prefill:{name:(form.firstName+' '+form.lastName).trim(),email:form.email,contact:form.phone},
        notes:{purpose:'Partial COD booking advance'},
        retry:{enabled:true},
        modal:{ondismiss:()=>setStage('')},
        handler:response=>confirmPayment(prepared,response)
      });
      checkout.on('payment.failed',payload=>{
        const description=payload?.error?.description || 'The advance payment was not completed.';
        setError(description);setStage('');
      });
      checkout.open();
    }catch(err){setStage('');setError(err.message);}
  }

  if(success) return <section className="partial-cod-success" aria-live="polite">
    <p className="eyebrow">ORDER CONFIRMED</p>
    <h1 className="editorial">Partial COD confirmed.</h1>
    <div className="partial-cod-success-grid">
      <div><span>Order</span><strong>{success.orderName || 'Confirmed'}</strong></div>
      <div><span>Advance paid</span><strong>{formatMoney(success.advance,'INR')}</strong></div>
      <div><span>Balance on delivery</span><strong>{formatMoney(success.codBalance,'INR')}</strong></div>
      <div><span>Delhivery waybill</span><strong>{success.waybill}</strong></div>
    </div>
    <p className="muted">Keep your order details and Razorpay payment reference until delivery. Delhivery will collect only the balance shown above.</p>
    <Link className="solid-button partial-cod-home" href="/">CONTINUE SHOPPING</Link>
  </section>;

  if(!cartId && !cartBusy) return <section className="partial-cod-empty">
    <p className="eyebrow">PARTIAL COD</p>
    <h1 className="editorial">Your bag is empty.</h1>
    <p>Add a product to your bag before starting Partial COD.</p>
    <Link className="solid-button" href="/products">EXPLORE AX</Link>
  </section>;

  return <section className="partial-cod-checkout">
    <div className="partial-cod-intro">
      <div><p className="eyebrow">PARTIAL CASH ON DELIVERY</p><h1 className="editorial">Pay a small advance. Pay the rest on delivery.</h1></div>
      <p>AX collects the booking advance securely through Razorpay. After verification, the remaining order balance is sent to Delhivery as COD.</p>
    </div>

    <form className="partial-cod-form" onSubmit={checkCod}>
      <div className="partial-cod-section-head"><span>01</span><div><strong>Delivery details</strong><small>India delivery only</small></div></div>
      <div className="partial-cod-fields">
        <label><span>First name</span><input name="firstName" value={form.firstName} onChange={update} autoComplete="given-name" required/></label>
        <label><span>Last name</span><input name="lastName" value={form.lastName} onChange={update} autoComplete="family-name" required/></label>
        <label><span>Email</span><input type="email" name="email" value={form.email} onChange={update} autoComplete="email" required/></label>
        <label><span>Mobile number</span><input inputMode="tel" name="phone" value={form.phone} onChange={update} autoComplete="tel" placeholder="10-digit Indian mobile" required/></label>
        <label className="full"><span>Address</span><input name="address1" value={form.address1} onChange={update} autoComplete="address-line1" required/></label>
        <label className="full"><span>Apartment / landmark (optional)</span><input name="address2" value={form.address2} onChange={update} autoComplete="address-line2"/></label>
        <label><span>City</span><input name="city" value={form.city} onChange={update} autoComplete="address-level2" required/></label>
        <label><span>Pincode</span><input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" name="pincode" value={form.pincode} onChange={update} autoComplete="postal-code" required/></label>
      </div>
      <button className="partial-cod-check" type="submit" disabled={stage==='quote'||cartBusy}>{stage==='quote'?'CHECKING…':'CHECK COD & DELIVERY'}</button>
    </form>

    {quote&&<div className="partial-cod-options">
      <div className="partial-cod-section-head"><span>02</span><div><strong>Delivery & payment split</strong><small>Choose one Delhivery service</small></div></div>
      <div className="partial-cod-rates">{quote.rates.map(rate=><button type="button" key={rate.code} className={shippingCode===rate.code?'selected':''} onClick={()=>setShippingCode(rate.code)}>
        <span className="partial-cod-radio" aria-hidden="true"/><span className="partial-cod-rate-copy"><strong>{rate.code==='standard'?'Standard Delivery':'Express Delivery'}</strong><small>{rate.minDays?(String(rate.minDays)+(rate.maxDays&&rate.maxDays!==rate.minDays?'–'+rate.maxDays:'')+' days estimated'):rate.label}</small></span>
        <span className="partial-cod-rate-price">{rate.amount===0?'FREE':formatMoney(rate.amount,'INR')}</span>
      </button>)}</div>

      {selected&&<div className="partial-cod-breakdown">
        <div><span>Final order value</span><strong>{formatMoney(selected.orderTotal,'INR')}</strong></div>
        <div className="advance"><span>Pay now via Razorpay</span><strong>{formatMoney(selected.advance,'INR')}</strong></div>
        <div><span>Pay Delhivery on delivery</span><strong>{formatMoney(selected.codBalance,'INR')}</strong></div>
        <small>Advance = greater of ₹100 or 10% of the final order value, with 10% rounded to the nearest ₹10.</small>
      </div>}

      <label className="partial-cod-consent">
        <input type="checkbox" checked={accepted} onChange={event=>setAccepted(event.target.checked)}/>
        <span>I understand the balance will be collected at delivery. For customer-attributable cancellations, refusals or accepted non-AX-fault returns, actual shipping/RTO or reverse-shipping and applicable COD/logistics charges may be deducted as described in the <Link href="/policies">AX Policies</Link>. AX-side issues are handled under the applicable refund policy.</span>
      </label>

      <button className="checkout-button partial-cod-pay" type="button" disabled={!selected||!accepted||Boolean(stage)||Boolean(pending)} onClick={payAdvance}>
        {stage==='prepare'?'PREPARING PAYMENT…':stage==='confirm'?'CONFIRMING ORDER…':selected?'PAY '+formatMoney(selected.advance,'INR')+' ADVANCE':'CHOOSE DELIVERY'}
      </button>
      <p className="partial-cod-secure">Secure payment by Razorpay · card, UPI and supported wallets. AX never receives your card number, CVV or UPI PIN.</p>
    </div>}

    {error&&<div className="partial-cod-error" role="alert">{error}</div>}
    <Link className="underlined-link partial-cod-back" href="/products">← CONTINUE SHOPPING</Link>
  </section>;
}
