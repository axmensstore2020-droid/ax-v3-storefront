'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './comingSoon.module.css';

const LAUNCH_AT = new Date('2026-09-27T06:30:00.000Z'); // Sunday, 12:00 PM IST
const GOOGLE_CALENDAR =
  'https://calendar.google.com/calendar/render?action=TEMPLATE' +
  '&text=' + encodeURIComponent('AX Store — Going Live') +
  '&dates=20260927T063000Z/20260927T073000Z' +
  '&details=' + encodeURIComponent('Inspired by the fear of being average. AX goes live Sunday at 12:00 PM IST. Special offer for the first 10 completed purchases. https://axstore.in') +
  '&location=' + encodeURIComponent('https://axstore.in');

function getCountdown(now) {
  const total = Math.max(0, LAUNCH_AT.getTime() - now.getTime());
  return {
    total,
    days: Math.floor(total / 86400000),
    hours: Math.floor((total / 3600000) % 24),
    minutes: Math.floor((total / 60000) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

function pad(value) {
  return String(value).padStart(2, '0');
}

export default function ComingSoonClient() {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef(null);
  const [now, setNow] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const countdown = useMemo(() => getCountdown(now), [now]);
  const isLive = countdown.total <= 0;

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function handlePointerMove(event) {
    if (!rootRef.current || reduceMotion) return;
    const rect = rootRef.current.getBoundingClientRect();
    rootRef.current.style.setProperty('--pointer-x', ((event.clientX - rect.left) / rect.width) * 100 + '%');
    rootRef.current.style.setProperty('--pointer-y', ((event.clientY - rect.top) / rect.height) * 100 + '%');
  }

  async function copyLaunch() {
    try {
      await navigator.clipboard.writeText('AX goes live Sunday, 27 September 2026 at 12:00 PM IST — axstore.in');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <motion.main
      ref={rootRef}
      className={styles.shell}
      onPointerMove={handlePointerMove}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.pointerGlow} aria-hidden="true" />

      <motion.div
        className={styles.introCurtain}
        aria-hidden="true"
        initial={reduceMotion ? { display: 'none' } : { scaleY: 1 }}
        animate={{ scaleY: 0 }}
        transition={{ duration: 0.9, delay: 0.12, ease: [0.76, 0, 0.24, 1] }}
      />

      <header className={styles.header}>
        <motion.div
          className={styles.logoWrap}
          aria-label="AX Store"
          initial={reduceMotion ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
        >
          <img className={styles.logo} src="/ax-logo-160.webp" alt="AX" />
        </motion.div>

        <motion.div
          className={styles.topStatus}
          initial={reduceMotion ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.62, duration: 0.5 }}
        >
          <span className={styles.liveDot} />
          <span>{isLive ? 'SIGNAL LIVE' : 'LAUNCH SIGNAL ARMED'}</span>
        </motion.div>
      </header>

      <section className={styles.stage}>
        <div className={styles.copy}>
          <motion.p
            className={styles.eyebrow}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.66, duration: 0.55 }}
          >
            AX MEN&apos;S STORE · COIMBATORE
          </motion.p>

          <div className={styles.headline} aria-label="Inspired by the fear of being average">
            {['INSPIRED BY', 'THE FEAR OF', 'BEING AVERAGE'].map((line, index) => (
              <div className={styles.lineMask} key={line}>
                <motion.span
                  initial={reduceMotion ? false : { y: '110%' }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.68 + index * 0.09, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  {line}
                </motion.span>
              </div>
            ))}
          </div>

          <motion.div
            className={styles.launchLine}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.02, duration: 0.6 }}
          >
            <span>GOING LIVE</span>
            <strong>SUNDAY · 12:00 PM IST</strong>
          </motion.div>

          <motion.div
            className={styles.actions}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.12, duration: 0.6 }}
          >
            {isLive ? (
              <a className={styles.primaryButton} href="/">
                ENTER AX <span>↗</span>
              </a>
            ) : (
              <button className={styles.primaryButton} type="button" onClick={() => setCalendarOpen(true)}>
                MARK THE DROP <span>↗</span>
              </button>
            )}
            <button className={styles.textButton} type="button" onClick={copyLaunch}>
              {copied ? 'DATE COPIED' : 'COPY LAUNCH DATE'}
            </button>
          </motion.div>
        </div>

        <motion.div
          className={styles.nodeField}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.72, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        >
          <div className={styles.orbitOuter}>
            <span className={styles.nodeA} />
            <span className={styles.nodeB} />
          </div>
          <div className={styles.orbitInner}>
            <span className={styles.nodeC} />
          </div>
          <svg className={styles.network} viewBox="0 0 600 600" role="presentation">
            <circle cx="300" cy="300" r="214" />
            <circle cx="300" cy="300" r="142" />
            <path d="M88 298 L300 156 L510 304 L302 444 Z" />
            <path d="M160 174 L442 428" />
          </svg>
          <div className={styles.core}>
            <div className={styles.coreHalo} />
            <div className={styles.coreLogo}>
              <img src="/ax-logo-160.webp" alt="" />
            </div>
          </div>
          <span className={styles.coordinates}>11.0168°N / 76.9558°E</span>
        </motion.div>
      </section>

      <section className={styles.bottomRail}>
        <motion.div
          className={styles.countdown}
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          aria-label={isLive ? 'AX is live' : 'Countdown to AX launch'}
        >
          {isLive ? (
            <div className={styles.liveMessage}>THE WAIT IS OVER.</div>
          ) : (
            <>
              <TimeUnit value={countdown.days} label="DAYS" />
              <TimeUnit value={countdown.hours} label="HRS" />
              <TimeUnit value={countdown.minutes} label="MIN" />
              <TimeUnit value={countdown.seconds} label="SEC" />
            </>
          )}
        </motion.div>

        <motion.div
          className={styles.offer}
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.28, duration: 0.6 }}
        >
          <div>
            <span className={styles.offerKicker}>LAUNCH PRIVILEGE</span>
            <strong>SPECIAL OFFER FOR THE FIRST 10 PURCHASES</strong>
          </div>
          <div className={styles.offerIndex}>01—10</div>
          <span className={styles.scanLine} aria-hidden="true" />
        </motion.div>
      </section>

      <footer className={styles.footer}>
        <span>AX / 2026</span>
        <span>A NEW SYSTEM IS ABOUT TO GO LIVE.</span>
      </footer>

      <AnimatePresence>
        {calendarOpen && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCalendarOpen(false)}
          >
            <motion.div
              className={styles.calendarSheet}
              role="dialog"
              aria-modal="true"
              aria-labelledby="calendar-title"
              initial={reduceMotion ? { opacity: 1 } : { y: 44, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { y: 28, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.sheetTop}>
                <div>
                  <span>REMINDER NODE</span>
                  <h2 id="calendar-title">MARK SUNDAY, 12 PM.</h2>
                </div>
                <button type="button" onClick={() => setCalendarOpen(false)} aria-label="Close calendar options">×</button>
              </div>
              <p>27 September 2026 · 12:00 PM IST. The calendar file includes a 15-minute reminder.</p>
              <div className={styles.calendarOptions}>
                <a href={GOOGLE_CALENDAR} target="_blank" rel="noopener noreferrer">
                  <span>GOOGLE CALENDAR</span><span>↗</span>
                </a>
                <a href="/coming-soon/launch.ics">
                  <span>APPLE / OUTLOOK / .ICS</span><span>↓</span>
                </a>
              </div>
              <div className={styles.sheetNote}>FIRST 10 PURCHASES · SPECIAL LAUNCH OFFER</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

function TimeUnit({ value, label }) {
  return (
    <div className={styles.timeUnit}>
      <span>{pad(value)}</span>
      <small>{label}</small>
    </div>
  );
}
