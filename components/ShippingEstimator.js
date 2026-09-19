'use client';
import {useState} from 'react';
import {formatMoney} from '../lib/catalog';
import {trackStoreEvent} from '../lib/store-analytics';

export default function ShippingEstimator({weightGrams,productHandle='',className='',subtotal=0}) {
  const [pincode,setPincode]=useState(''),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const usable=Number.isFinite(Number(weightGrams)) && Number(weightGrams)>0;
  async function check(event) {
    event.preventDefault();
    if(!usable){setError('Delivery weight is unavailable for this item.');return;}
    setBusy(true);setError('');setResult(null);
    try{
      const response=await fetch('/api/shipping/estimate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pincode,weightGrams:Number(weightGrams),subtotal:Number(subtotal)||0})});
      const data=await response.json();
      if(!response.ok || !data.ok) throw new Error(data.error || 'Delivery check is temporarily unavailable.');
      setResult(data);
      trackStoreEvent('shipping_quote',{productHandle,metadata:{serviceable:Boolean(data.serviceable),rateCount:data.rates?.length||0}});
    }catch(err){setError(err.message || 'Delivery check is temporarily unavailable.');}
    finally{setBusy(false);}
  }
  return <section className={`shipping-estimator ${className}`.trim()} aria-label="Check delivery">
    <p className="shipping-estimator-title">Check delivery to your pincode</p>
    <form onSubmit={check}>
      <label><span className="sr-only">Delivery pincode</span><input inputMode="numeric" autoComplete="postal-code" maxLength={6} pattern="[0-9]{6}" value={pincode} onChange={e=>setPincode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit pincode" required/></label>
      <button type="submit" disabled={busy || pincode.length!==6 || !usable}>{busy?'CHECKING…':'CHECK'}</button>
    </form>
    {!usable && <p className="shipping-estimator-note">Delivery cost will be confirmed at checkout.</p>}
    {error && <p className="shipping-estimator-error" role="alert">{error}</p>}
    {result && !result.serviceable && <p className="shipping-estimator-error">Delhivery prepaid delivery is currently unavailable to {result.pincode}.</p>}
    {result?.serviceable && <div className="shipping-rate-list">{result.rates.map(rate=><p key={rate.code}><span>{rate.label}</span><strong>{formatMoney(rate.amount,rate.currency)}</strong></p>)}<small>Live carrier estimate. Final options are confirmed at checkout.</small></div>}
  </section>;
}
