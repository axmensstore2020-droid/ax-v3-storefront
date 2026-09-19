'use client';
import {useEffect,useState} from 'react';
import {trackStoreEvent} from '../lib/store-analytics';

const PIN_KEY='ax_delivery_pincode';

function deliveryWindow(estimate){
  const min=Number(estimate?.minDays),max=Number(estimate?.maxDays);
  if(!Number.isFinite(min) || min<=0) return '';
  if(!Number.isFinite(max) || max<=0 || max===min) return min+' working day'+(min===1?'':'s');
  return min+'–'+max+' working days';
}
function locationLabel(result){
  const values=[result?.location?.city,result?.location?.stateCode].filter(Boolean);
  return values.length?values.join(', '):result?.pincode || '';
}

export default function ShippingEstimator({weightGrams,productHandle='',className='',subtotal=0,compact=false}) {
  const [pincode,setPincode]=useState(''),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const hasWeight=Number.isFinite(Number(weightGrams)) && Number(weightGrams)>0;

  useEffect(()=>{
    try{
      const saved=localStorage.getItem(PIN_KEY);
      if(/^\d{6}$/.test(saved||'')) setPincode(saved);
    }catch{}
  },[]);

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
          minDays:data.estimatedDelivery?.minDays || null,
          maxDays:data.estimatedDelivery?.maxDays || null
        }
      });
    }catch(err){setError(err.message || 'Delivery check is temporarily unavailable.');}
    finally{setBusy(false);}
  }

  const place=locationLabel(result),eta=deliveryWindow(result?.estimatedDelivery);
  return <section className={`shipping-estimator ${compact?'shipping-estimator-compact':''} ${className}`.trim()} aria-label="Check delivery">
    <div className="shipping-estimator-heading">
      <div><span className="shipping-estimator-kicker">DELIVERY</span><strong>Check pincode & delivery</strong></div>
      {result?.serviceable && <span className="delivery-status delivery-status-ok">DELIVERABLE</span>}
    </div>
    <form onSubmit={check}>
      <label><span className="sr-only">Delivery pincode</span><input inputMode="numeric" autoComplete="postal-code" maxLength={6} pattern="[0-9]{6}" value={pincode} onChange={e=>{setPincode(e.target.value.replace(/\D/g,'').slice(0,6));setResult(null);setError('');}} placeholder="Enter 6-digit pincode" required/></label>
      <button type="submit" disabled={busy || pincode.length!==6}>{busy?'CHECKING…':'CHECK'}</button>
    </form>
    {error && <p className="shipping-estimator-error" role="alert">{error}</p>}
    {result && !result.serviceable && <div className="delivery-result delivery-result-no"><strong>Not deliverable</strong><span>Delivery is currently unavailable to {result.pincode}.</span></div>}
    {result?.serviceable && <div className="delivery-result delivery-result-ok">
      <strong>{'Deliverable'+(place?' to '+place:'')}</strong>
      <div className="delivery-estimate"><span>Estimated delivery</span><strong>{eta || 'Timing unavailable'}</strong></div>
      {result.location?.isOda&&<p className="shipping-estimator-note">Extended delivery area — timing can vary slightly.</p>}
      <small>Estimated timing is indicative and can change with carrier operations or local conditions.</small>
    </div>}
    {!result && !error && <p className="shipping-estimator-note">Enter your pincode to check delivery availability and estimated delivery time.</p>}
  </section>;
}
