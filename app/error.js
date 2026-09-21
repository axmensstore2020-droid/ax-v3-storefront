'use client';
import {useEffect} from 'react';

function report(error){
  try{
    fetch('/api/errors/client',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        name:error?.name || 'Error',
        message:error?.message || 'Page error',
        stack:error?.stack || '',
        digest:error?.digest || '',
        path:window.location.pathname
      }),
      keepalive:true
    }).catch(()=>{});
  }catch{}
}

export default function ErrorPage({error,reset}){
  useEffect(()=>{if(error)report(error);},[error]);
  return <main id="main-content" className="empty-products"><h1 className="editorial">A moment, please.</h1><p>We couldn’t load this page. Please try again.</p><button className="underlined-link" onClick={reset}>TRY AGAIN</button></main>;
}
