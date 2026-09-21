'use client';
import {useEffect} from 'react';

export default function GlobalError({error,reset}){
  useEffect(()=>{
    if(!error)return;
    try{
      fetch('/api/errors/client',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          name:error?.name || 'Error',
          message:error?.message || 'Root application error',
          stack:error?.stack || '',
          digest:error?.digest || '',
          path:window.location.pathname
        }),
        keepalive:true
      }).catch(()=>{});
    }catch{}
  },[error]);
  return <html><body><main><h1>AX</h1><p>We couldn’t load the store.</p><button type="button" onClick={reset}>Try again</button></main></body></html>;
}
