'use client';

import {useEffect,useRef,useState} from 'react';

export default function HeroVideo({mobileSrc,desktopSrc,className='editorial-hero-video'}) {
 const videoRef=useRef(null);
 const [ready,setReady]=useState(false);
 const [failed,setFailed]=useState(false);

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

  if(video.readyState>=2) play();
  else video.addEventListener('canplay',play,{once:true});

  document.addEventListener('visibilitychange',handleVisibility);
  return () => {
   video.removeEventListener('canplay',play);
   document.removeEventListener('visibilitychange',handleVisibility);
  };
 },[failed]);

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
  onCanPlay={() => setReady(true)}
  onPlaying={() => setReady(true)}
  onError={() => setFailed(true)}
 >
  <source media="(max-width:700px)" src={mobileSrc} type="video/mp4"/>
  <source src={desktopSrc} type="video/mp4"/>
 </video>;
}
