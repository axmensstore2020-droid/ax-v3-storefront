'use client';

import {useEffect,useRef,useState} from 'react';

function retryUrl(src,retryKey){
 if(!src || !retryKey) return src;
 return src+(src.includes('?')?'&':'?')+'ax_retry='+retryKey;
}

export default function HeroVideo({
 mobileSrc,
 desktopSrc,
 mobileFallbackSrc='',
 desktopFallbackSrc='',
 className='editorial-hero-video'
}) {
 const videoRef=useRef(null);
 const retryCount=useRef(0);
 const recoveryTimer=useRef(null);
 const [ready,setReady]=useState(false);
 const [usingFallback,setUsingFallback]=useState(false);
 const [retryKey,setRetryKey]=useState(0);
 const [failed,setFailed]=useState(false);
 const hasFallback=Boolean(mobileFallbackSrc || desktopFallbackSrc);

 const activeMobile=usingFallback ? (mobileFallbackSrc || desktopFallbackSrc) : mobileSrc;
 const activeDesktop=usingFallback ? (desktopFallbackSrc || mobileFallbackSrc) : desktopSrc;

 function recover(){
  if(failed || recoveryTimer.current) return;
  if(retryCount.current<1){
   retryCount.current+=1;
   setReady(false);
   recoveryTimer.current=setTimeout(()=>{
    recoveryTimer.current=null;
    setRetryKey(value=>value+1);
   },700);
   return;
  }
  if(!usingFallback && hasFallback){
   retryCount.current=0;
   setRetryKey(0);
   setReady(false);
   setUsingFallback(true);
   return;
  }
  setFailed(true);
 }

 useEffect(() => {
  const video=videoRef.current;
  if(!video || failed) return;

  video.muted=true;
  video.defaultMuted=true;
  video.playsInline=true;

  const play=() => {
   const attempt=video.play();
   if(attempt?.catch) attempt.catch(() => {});
  };

  const handleVisibility=() => {
   if(document.visibilityState==='visible' && video.paused) play();
  };

  // Changing retry/fallback source must force a fresh media request.
  video.load();
  if(video.readyState>=2) play();
  else video.addEventListener('canplay',play,{once:true});

  // If a request hangs rather than throwing an error, move through the same
  // retry -> backup-source chain instead of leaving a frozen hero indefinitely.
  const watchdog=setTimeout(()=>{
   if(video.readyState<2) recover();
  },10000);

  document.addEventListener('visibilitychange',handleVisibility);
  return () => {
   clearTimeout(watchdog);
   video.removeEventListener('canplay',play);
   document.removeEventListener('visibilitychange',handleVisibility);
  };
 },[usingFallback,retryKey,failed]);

 useEffect(()=>()=>{if(recoveryTimer.current) clearTimeout(recoveryTimer.current);},[]);

 if(failed) return null;

 return <video
  ref={videoRef}
  className={`${className}${ready ? ' is-ready' : ''}`}
  autoPlay
  muted
  loop
  playsInline
  preload="auto"
  aria-hidden="true"
  onLoadedData={() => setReady(true)}
  onCanPlay={() => {retryCount.current=0;setReady(true);}}
  onPlaying={() => {retryCount.current=0;setReady(true);}}
  onError={recover}
 >
  {activeMobile && <source key={'mobile-'+usingFallback+'-'+retryKey} media="(max-width:700px)" src={retryUrl(activeMobile,retryKey)} type="video/mp4"/>}
  {activeDesktop && <source key={'desktop-'+usingFallback+'-'+retryKey} src={retryUrl(activeDesktop,retryKey)} type="video/mp4"/>}
 </video>;
}
