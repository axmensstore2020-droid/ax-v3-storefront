'use client';

import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {useEffect,useMemo,useState} from 'react';
import AXPlayroom from '../../components/AXPlayroom';
import {trackLaunchEvent} from '../../lib/launch-analytics';
import styles from './comingSoon.module.css';

const LAUNCH_AT=new Date('2026-10-01T10:30:00.000Z');
const GOOGLE_CALENDAR=
  'https://calendar.google.com/calendar/render?action=TEMPLATE'+
  '&text='+encodeURIComponent('AX Store — Going Live')+
  '&dates=20261001T103000Z/20261001T113000Z'+
  '&details='+encodeURIComponent('AX goes live Thursday, 1 October at 4:00 PM IST. Beat AX before launch and unlock 10% off for launch day. https://axstore.in')+
  '&location='+encodeURIComponent('https://axstore.in');

function getCountdown(now){
  const total=Math.max(0,LAUNCH_AT.getTime()-now.getTime());
  return {
    total,
    days:Math.floor(total/86400000),
    hours:Math.floor((total/3600000)%24),
    minutes:Math.floor((total/60000)%60),
    seconds:Math.floor((total/1000)%60),
  };
}

function pad(value){return String(value).padStart(2,'0');}

export default function ComingSoonClient(){
  const reduceMotion=useReducedMotion();
  const [now,setNow]=useState(()=>new Date());
  const [calendarOpen,setCalendarOpen]=useState(false);
  const [playOpen,setPlayOpen]=useState(false);
  const [playStatus,setPlayStatus]=useState(null);
  const [playLoading,setPlayLoading]=useState(false);
  const [playError,setPlayError]=useState('');
  const countdown=useMemo(()=>getCountdown(now),[now]);
  const isLive=countdown.total<=0;

  useEffect(()=>{
    const root=document.documentElement;
    const frame=window.requestAnimationFrame(()=>root.removeAttribute('data-ax-coming-soon-boot'));
    trackLaunchEvent('launch_visit',{metadata:{surface:'coming-soon'}});
    return()=>window.cancelAnimationFrame(frame);
  },[]);

  useEffect(()=>{
    const id=window.setInterval(()=>setNow(new Date()),1000);
    return()=>window.clearInterval(id);
  },[]);

  useEffect(()=>{
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=previous;};
  },[]);

  function openCalendar(source){
    trackLaunchEvent('launch_calendar_click',{metadata:{source}});
    setCalendarOpen(true);
  }

  async function enterPlayroom(){
    setPlayError('');
    setPlayLoading(true);
    try{
      const response=await fetch('/api/playroom',{cache:'no-store',credentials:'same-origin'});
      const data=await response.json().catch(()=>null);
      if(!response.ok||!data?.available)throw new Error('The Playroom is unavailable right now.');
      if(!data.eligible&&!data.bonusAvailable){
        throw new Error(data.lastOutcome==='win'
          ? 'Your launch reward is already secured.'
          : 'The Playroom is resting. Come back for another shot before launch.');
      }
      setPlayStatus(data);
      setPlayOpen(true);
      trackLaunchEvent('launch_playroom_open',{metadata:{series_you:Number(data?.series?.you)||0,series_ax:Number(data?.series?.ax)||0}});
    }catch(error){
      setPlayError(error.message||'The Playroom is unavailable right now.');
    }finally{
      setPlayLoading(false);
    }
  }

  return (
    <main className={styles.shell}>
      <div className={styles.softGrid} aria-hidden="true"/>
      <div className={styles.orbOne} aria-hidden="true"/>
      <div className={styles.orbTwo} aria-hidden="true"/>

      <header className={styles.header}>
        <motion.div
          className={styles.brand}
          initial={reduceMotion?false:{opacity:0,y:-8}}
          animate={{opacity:1,y:0}}
          transition={{duration:.45}}
        >
          <img src="/ax-logo-160.webp" alt="AX"/>
          <span>WEBSITE LAUNCH<br/>01 OCT · 4 PM</span>
        </motion.div>
        <button className={styles.calendarLink} type="button" onClick={()=>openCalendar('header')}>
          MARK YOUR CALENDARS <span>↗</span>
        </button>
      </header>

      <section className={styles.hero}>
        <motion.div
          className={styles.copy}
          initial={reduceMotion?false:{opacity:0,y:16}}
          animate={{opacity:1,y:0}}
          transition={{duration:.62,ease:[.16,1,.3,1]}}
        >
          <p className={styles.eyebrow}>THE AX LAUNCH PLAYROOM</p>
          <h1>
            <span>Your</span>
            <span className={styles.script}>move.</span>
          </h1>
          <p className={styles.lede}>
            AX goes live Thursday, 1 October at 4:00 PM IST.<br/>
            Beat AX in a best-of-three match and unlock <strong>10% off for launch day.</strong>
          </p>

          <div className={styles.actions}>
            {isLive?(
              <a className={styles.primaryButton} href="/">ENTER AX <span>↗</span></a>
            ):(
              <button className={styles.primaryButton} type="button" onClick={enterPlayroom} disabled={playLoading}>
                {playLoading?'OPENING…':'ENTER PLAYROOM'} <span>↗</span>
              </button>
            )}
            <button className={styles.secondaryButton} type="button" onClick={()=>openCalendar('hero')}>
              MARK YOUR CALENDARS
            </button>
          </div>
          {playError&&<p className={styles.playError} role="status">{playError}</p>}
        </motion.div>

        <motion.div
          className={styles.art}
          initial={reduceMotion?false:{opacity:0,scale:.94}}
          animate={{opacity:1,scale:1}}
          transition={{delay:.12,duration:.75,ease:[.16,1,.3,1]}}
          aria-hidden="true"
        >
          <div className={styles.orbit}/>
          <div className={styles.shadow}/>
          <div className={styles.oShape}/>
          <div className={styles.xShape}/>
          <span>Nine squares. One launch reward.</span>
        </motion.div>
      </section>

      <section className={styles.rewardRail}>
        <div className={styles.reward}>
          <span className={styles.rewardNumber+' '+styles.rewardNeon}>10<small>%</small></span>
          <p><strong>Beat AX</strong>Launch-day reward.</p>
        </div>
        <i/>
        <div className={styles.reward}>
          <span className={styles.rewardNumber}>3</span>
          <p><strong>Best of three</strong>First to 2 wins.</p>
        </div>
        <div className={styles.rewardNote}>BEST OF 3 · FIRST TO 2 WINS · UNLOCK 10%</div>
      </section>

      <section className={styles.countdownSection} aria-label={isLive?'AX is live':'Countdown to AX launch'}>
        <div className={styles.countdownTop}>
          <span>TIME UNTIL AX GOES LIVE</span>
          <span>01 OCT · 4:00 PM IST</span>
        </div>
        {isLive?(
          <div className={styles.liveMessage}>WE&apos;RE LIVE.</div>
        ):(
          <div className={styles.countdown}>
            <TimeUnit value={countdown.days} label="DAYS"/>
            <TimeUnit value={countdown.hours} label="HRS"/>
            <TimeUnit value={countdown.minutes} label="MIN"/>
            <TimeUnit value={countdown.seconds} label="SEC"/>
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <span>AX / COIMBATORE</span>
        <strong>BEAT AX · WIN 10% · SEE YOU 1 OCT</strong>
        <span>01 · 10 · 2026</span>
      </footer>

      {playOpen&&<AXPlayroom initialStatus={playStatus} launchMode/>}

      <AnimatePresence>
        {calendarOpen&&(
          <motion.div
            className={styles.modalBackdrop}
            initial={{opacity:0}}
            animate={{opacity:1}}
            exit={{opacity:0}}
            onClick={()=>setCalendarOpen(false)}
          >
            <motion.div
              className={styles.calendarSheet}
              role="dialog"
              aria-modal="true"
              aria-labelledby="calendar-title"
              initial={reduceMotion?{opacity:1}:{y:36,opacity:0}}
              animate={{y:0,opacity:1}}
              exit={reduceMotion?{opacity:0}:{y:24,opacity:0}}
              transition={{duration:.32,ease:[.16,1,.3,1]}}
              onClick={event=>event.stopPropagation()}
            >
              <div className={styles.sheetTop}>
                <div>
                  <span>AX / WEBSITE LAUNCH</span>
                  <h2 id="calendar-title">Mark your calendars.</h2>
                </div>
                <button type="button" onClick={()=>setCalendarOpen(false)} aria-label="Close calendar options">×</button>
              </div>
              <p>Thursday, 1 October 2026 · 4:00 PM IST. The calendar file includes a 15-minute reminder.</p>
              <div className={styles.calendarOptions}>
                <a href={GOOGLE_CALENDAR} target="_blank" rel="noopener noreferrer" onClick={()=>trackLaunchEvent('launch_calendar_click',{metadata:{source:'calendar-sheet',provider:'google'}})}><span>GOOGLE CALENDAR</span><span>↗</span></a>
                <a href="/coming-soon/launch.ics" onClick={()=>trackLaunchEvent('launch_calendar_click',{metadata:{source:'calendar-sheet',provider:'ics'}})}><span>APPLE / OUTLOOK / .ICS</span><span>↓</span></a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function TimeUnit({value,label}){
  return <div className={styles.timeUnit}><span>{pad(value)}</span><small>{label}</small></div>;
}
