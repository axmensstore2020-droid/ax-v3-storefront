'use client';
import {useEffect,useState} from 'react';
import {formatMoney} from '../lib/catalog';
import {trackStoreEvent} from '../lib/store-analytics';

const PIN_KEY='ax_delivery_pincode';

function deliveryWindow(rate){
  const min=Number(rate?.minDays),max=Number(rate?.maxDays);
  if(!Number.isFinite(min) || min<=0) return '';
  if(!Number.isFinite(max) || max<=0 || max===min) return 'Estimated '+min+' day'+(min===1?'':'s');
  return 'Estimated '+min+'–'+max+' days';
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
      trackStoreEvent('shipping_quote',{productHandle,metadata:{serviceable:Boolean(data.serviceable),rateCount:data.rates?.length||0,hasWeight}});
    }catch(err){setError(err.message || 'Delivery check is temporarily unavailable.');}
    finally{setBusy(false);}
  }

  const place=locationLabel(result);
  return <section className={`shipping-estimator ${compact?'shipping-estimator-compact':''} ${className}`.trim()} aria-label="Check delivery">
    <div className="shipping-estimator-heading">
      <div><span className="shipping-estimator-kicker">DELIVERY</span><strong>Check pincode & delivery</strong></div>
      {result?.serviceable && <span className="delivery-status delivery-status-ok">SERVICEABLE</span>}
    </div>
    <form onSubmit={check}>
      <label><span className="sr-only">Delivery pincode</span><input inputMode="numeric" autoComplete="postal-code" maxLength={6} pattern="[0-9]{6}" value={pincode} onChange={e=>{setPincode(e.target.value.replace(/\D/g,'').slice(0,6));setResult(null);setError('');}} placeholder="Enter 6-digit pincode" required/></label>
      <button type="submit" disabled={busy || pincode.length!==6}>{busy?'CHECKING…':'CHECK'}</button>
    </form>
    {error && <p className="shipping-estimator-error" role="alert">{error}</p>}
    {result && !result.serviceable && <div className="delivery-result delivery-result-no"><strong>Delivery unavailable</strong><span>Delhivery prepaid delivery is currently unavailable to {result.pincode}.</span></div>}
    {result?.serviceable && <div className="delivery-result delivery-result-ok">
      <div className="delivery-result-head"><strong>{'Delivery available'+(place?' to '+place:'')}</strong>{result.location?.isOda&&<span>Extended delivery area</span>}</div>
      {result.rates?.length>0 ? <div className="shipping-rate-list">{result.rates.map(rate=><div className="shipping-rate" key={rate.code}><div><strong>{rate.label}</strong><span>{deliveryWindow(rate)||'Carrier delivery timing confirmed at dispatch'}</span></div><strong>{formatMoney(rate.amount,rate.currency)}</strong></div>)}</div> : result.needsWeight ? <p className="shipping-estimator-note">This pincode is serviceable. Choose a size to confirm the shipping rate for this item.</p> : <p className="shipping-estimator-note">{result.error || 'This pincode is serviceable. Shipping rate will be confirmed at checkout.'}</p>}
      <small>Live Delhivery serviceability. Shipping rate is an estimate and is rechecked at checkout.</small>
    </div>}
    {!result && !error && <p className="shipping-estimator-note">{hasWeight?'Check your pincode for live serviceability and shipping rates.':'You can check pincode serviceability now; exact rate appears when a shippable variant weight is available.'}</p>}
  </section>;
}
