'use client';
import {useState} from 'react';

export default function BackInStockAlert({productHandle,variantId,variantLabel=''}) {
  const [email,setEmail]=useState(''),[status,setStatus]=useState('idle'),[message,setMessage]=useState('');

  async function submit(event){
    event.preventDefault();
    if(status==='loading')return;
    setStatus('loading');setMessage('');
    try{
      const response=await fetch('/api/back-in-stock',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,productHandle,variantId})
      });
      const data=await response.json().catch(()=>({}));
      if(response.status===409 && data?.available){
        setStatus('available');setMessage('Good news — this option is available now. Refresh the page to add it to your bag.');return;
      }
      if(!response.ok) throw new Error(data?.error || 'Restock signup is unavailable right now.');
      setStatus('success');
      setMessage('Check your email to confirm this restock alert. The confirmation link expires in 24 hours.');
      setEmail('');
    }catch(error){
      setStatus('error');setMessage(error?.message || 'Restock signup is unavailable right now.');
    }
  }

  return <div className="restock-alert">
    <div className="restock-alert-heading">
      <span className="eyebrow">BACK IN STOCK</span>
      <strong>Want this option?</strong>
      {variantLabel&&<small>{variantLabel}</small>}
    </div>
    <form onSubmit={submit}>
      <label>
        <span className="sr-only">Email for back-in-stock alert</span>
        <input type="email" inputMode="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="Email address" required maxLength={254}/>
      </label>
      <button type="submit" disabled={status==='loading'}>{status==='loading'?'SAVING…':'NOTIFY ME'}</button>
    </form>
    <p className="restock-alert-note">One transactional alert for this selected option. This does not subscribe you to marketing.</p>
    {message&&<p className={'restock-alert-message '+status} role="status">{message}</p>}
  </div>;
}
