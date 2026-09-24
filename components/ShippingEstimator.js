'use client';
import {useEffect,useRef,useState} from 'react';
import {trackStoreEvent} from '../lib/store-analytics';
import {requestMotionScan} from '../lib/motion-scan';

const PIN_KEY='ax_delivery_pincode';

function locationLabel(result){
  const values=[result?.location?.city,result?.location?.stateCode].filter(Boolean);
  return values.length?values.join(', '):result?.pincode || '';
}
function formatDeliveryDate(value){
  const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match)return '';
  const date=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])));
  return new Intl.DateTimeFormat('en-IN',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(date);
}

export default function ShippingEstimator({weightGrams,productHandle='',className='',subtotal=0,compact=false}) {
  const [pincode,setPincode]=useState(''),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const inputRef=useRef(null),sectionRef=useRef(null);
  const hasWeight=Number.isFinite(Number(weightGrams)) && Number(weightGrams)>0;

  useEffect(()=>{
    try{
      const saved=localStorage.getItem(PIN_KEY);
      if(/^\d{6}$/.test(saved||'')) setPincode(saved);
    }catch{}
  },[]);

  useEffect(()=>{
    if(result||error) requestMotionScan(sectionRef.current);
  },[result,error]);

  async function check(event) {
    event?.preventDefault?.();
    if(pincode.length!==6)return;
    setBusy(true);setError('');setResult(null);
    try{
      const payload={pincode,subtotal:Number(subtotal)||0,...(hasWeight?{weightGrams:Number(weightGrams)}:{})};
      const response=await fetch('/api/shipping/estimate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await response.json();
      if(!response.ok || !data.ok) throw new Error(data.error || 'Delivery check is temporarily unavailable.');
      setResult(data);
      try{localStorage.setItem(PIN_KEY,pincode);}catch{}
      trackStoreEvent('shipping_quote',{
        productHandle,
        metadata:{
          serviceable:Boolean(data.serviceable),
          codAvailable:Boolean(data.codAvailable),
          minDays:data.estimatedDelivery?.minDays || null,
          maxDays:data.estimatedDelivery?.maxDays || null,
          estimateSource:data.estimatedDelivery?.source || null
        }
      });
    }catch(err){setError(err.message || 'Delivery check is temporarily unavailable.');}
    finally{setBusy(false);}
  }

  function changeLocation(){
    setResult(null);setError('');
    requestAnimationFrame(()=>inputRef.current?.focus());
  }

  const place=locationLabel(result);
  const deliveryDate=formatDeliveryDate(result?.estimatedDelivery?.latestDate);
  const deliveryService=result?.estimatedDelivery?.service==='express'?'EXPRESS DELIVERY':'STANDARD DELIVERY';
  return <section ref={sectionRef} className={`shipping-estimator ${compact?'shipping-estimator-compact':''} ${className}`.trim()} aria-label="Delivery and services">
    <div className="shipping-estimator-heading"><strong>Delivery &amp; Services</strong></div>
    {result
      ? <div className="delivery-location-row"><div><strong>{result.pincode}</strong>{place&&<span>{place}</span>}</div><button type="button" className="delivery-change" onClick={changeLocation}>CHANGE</button></div>
      : <form onSubmit={check}>
          <label><span className="sr-only">Delivery pincode</span><input ref={inputRef} inputMode="numeric" autoComplete="postal-code" maxLength={6} pattern="[0-9]{6}" value={pincode} onChange={e=>{setPincode(e.target.value.replace(/\D/g,'').slice(0,6));setError('');}} placeholder="Enter pincode" required/></label>
          <button type="submit" disabled={busy || pincode.length!==6}>{busy?'CHECKING…':'CHECK'}</button>
        </form>}
    {error && <p className="shipping-estimator-error" role="alert">{error}</p>}
    {result && !result.serviceable && <div className="delivery-result delivery-result-no"><strong>Delivery unavailable</strong><span>We currently cannot deliver to this pincode.</span></div>}
    {result?.serviceable && <div className="delivery-services-list">
      <div className="delivery-service delivery-service-primary">
        <span className="delivery-service-mark" aria-hidden="true">✓</span>
        <div><small>{deliveryService}</small><strong>{deliveryDate?`Estimated delivery by ${deliveryDate}`:'Delivery available'}</strong>{place&&<span>To {place}</span>}</div>
      </div>
      <div className={`delivery-service ${result.codAvailable?'':'delivery-service-unavailable'}`}>
        <span className="delivery-service-mark" aria-hidden="true">{result.codAvailable?'✓':'×'}</span>
        <div><strong>Cash on Delivery {result.codAvailable?'available':'unavailable'}</strong>{result.codAvailable&&<span>COD handling: ₹40 or 2% of product value, whichever is higher.</span>}</div>
      </div>
      <div className="delivery-service">
        <span className="delivery-service-mark" aria-hidden="true">✓</span>
        <div><strong>7-day exchange available</strong><span>Return + forward shipping charges apply. Exchange is subject to availability of the requested replacement.</span></div>
      </div>
      {result.location?.isOda&&<p className="shipping-estimator-note">Extended delivery area — timing can vary with local carrier operations.</p>}
    </div>}
    {!result && !error && <p className="shipping-estimator-note">Enter your pincode to see the delivery date and Cash on Delivery availability.</p>}
  </section>;
}
