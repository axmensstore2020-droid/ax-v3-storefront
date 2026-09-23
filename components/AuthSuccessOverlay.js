'use client';
import {useEffect,useRef,useState} from 'react';
import Brand from './Brand';
import styles from './AuthSuccessOverlay.module.css';

function cleanedUrl(){
  const url=new URL(window.location.href);
  if(url.searchParams.get('axAuth')!=='complete') return null;
  url.searchParams.delete('axAuth');
  return url.pathname+(url.search?url.search:'')+(url.hash||'');
}

export default function AuthSuccessOverlay(){
  const [visible,setVisible]=useState(false);
  const [leaving,setLeaving]=useState(false);
  const timers=useRef([]);

  useEffect(()=>{
    if(typeof window==='undefined') return;
    const clean=cleanedUrl();
    if(!clean) return;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setVisible(true);
    const finish=()=>{
      setLeaving(true);
      const exit=window.setTimeout(()=>{
        window.history.replaceState(window.history.state,'',clean);
        setVisible(false);
      },reduced?80:260);
      timers.current.push(exit);
    };
    const timer=window.setTimeout(finish,reduced?360:1450);
    timers.current.push(timer);
    return()=>{timers.current.forEach(id=>window.clearTimeout(id));timers.current=[];};
  },[]);

  if(!visible) return null;
  return <div className={styles.overlay} data-leaving={leaving?'true':'false'} role="status" aria-live="polite" aria-label="AX sign-in verified">
    <div className={styles.stage}>
      <span className={styles.orbit} aria-hidden="true"/>
      <span className={styles.scan} aria-hidden="true"/>
      <div className={styles.logo}><Brand/></div>
      <div className={styles.copy}><span className={styles.kicker}>VERIFIED</span><strong>You’re in.</strong><small>Welcome back to AX.</small></div>
      <span className={styles.progress} aria-hidden="true"><i/></span>
    </div>
  </div>;
}
