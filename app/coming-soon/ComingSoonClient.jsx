'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './comingSoon.module.css';

const LAUNCH_AT = new Date('2026-09-27T06:30:00.000Z'); // Sunday, 12:00 PM IST
const GOOGLE_CALENDAR =
  'https://calendar.google.com/calendar/render?action=TEMPLATE' +
  '&text=' + encodeURIComponent('AX Store — Going Live') +
  '&dates=20260927T063000Z/20260927T073000Z' +
  '&details=' + encodeURIComponent('Inspired by the fear of being average. AX goes live Sunday at 12:00 PM IST. https://axstore.in') +
  '&location=' + encodeURIComponent('https://axstore.in');

const DOSSIER_ROWS = [
  ['DIVISION', 'AX / PRIVATE RELEASE'],
  ['ORIGIN', 'COIMBATORE'],
  ['FILE', 'AX-0927-CBE'],
  ['ACCESS', 'RESTRICTED'],
];

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
    const root = document.documentElement;
    const frame = window.requestAnimationFrame(() => {
      root.removeAttribute('data-ax-coming-soon-boot');
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

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
    <main ref={rootRef} className={styles.shell} onPointerMove={handlePointerMove}>
      <div className={styles.paperTexture} aria-hidden="true" />
      <div className={styles.pointerWash} aria-hidden="true" />
      <div className={styles.scanPass} aria-hidden="true" />

      <motion.div
        className={styles.document}
        initial={reduceMotion ? false : { opacity: 0, y: 14, rotate: -0.35 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <header className={styles.header}>
          <motion.div
            className={styles.logoBlock}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.22, duration: 0.5 }}
          >
            <img src="/ax-logo-160.webp" alt="AX" />
          </motion.div>

          <div className={styles.headerMeta}>
            <span>AX INTERNAL DOSSIER</span>
            <span>DOCUMENT / 0927</span>
          </div>

          <motion.div
            className={styles.stamp}
            initial={reduceMotion ? false : { opacity: 0, scale: 1.35, rotate: -12 }}
            animate={{ opacity: 0.72, scale: 1, rotate: -6 }}
            transition={{ delay: 0.52, duration: 0.28, ease: [0.2, 0.9, 0.2, 1] }}
            aria-hidden="true"
          >
            RESTRICTED
          </motion.div>
        </header>

        <section className={styles.fileGrid}>
          <aside className={styles.fileMeta} aria-label="Document metadata">
            {DOSSIER_ROWS.map(([label, value], index) => (
              <motion.div
                className={styles.metaRow}
                key={label}
                initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.06, duration: 0.42 }}
              >
                <span>{label}</span>
                <strong>{value}</strong>
              </motion.div>
            ))}

            <div className={styles.encryptedBlock} aria-hidden="true">
              <EncryptedLine delay={0.52} width="86%" />
              <EncryptedLine delay={0.6} width="64%" />
              <EncryptedLine delay={0.68} width="92%" />
              <EncryptedLine delay={0.76} width="46%" />
            </div>

            <div className={styles.microcopy}>
              <span>ARCHIVE REF. 26/09/AX</span>
              <span>UNAUTHORISED DETAILS REDACTED</span>
            </div>
          </aside>

          <section className={styles.primary}>
            <motion.p
              className={styles.eyebrow}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.46, duration: 0.4 }}
            >
              PUBLIC-FACING EXTRACT / 01
            </motion.p>

            <div className={styles.headline} aria-label="Inspired by the fear of being average">
              {['INSPIRED BY', 'THE FEAR OF', 'BEING AVERAGE'].map((line, index) => (
                <div className={styles.lineMask} key={line}>
                  <motion.span
                    initial={reduceMotion ? false : { y: '115%' }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.48 + index * 0.08, duration: 0.78, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {line}
                  </motion.span>
                </div>
              ))}
            </div>

            <motion.div
              className={styles.releasePanel}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <div className={styles.releaseLabel}>PUBLIC RELEASE</div>
              <div className={styles.releaseDate}>
                <span>SUNDAY</span>
                <strong>12:00 PM IST</strong>
              </div>
              <div className={styles.releaseRule} />
              <div className={styles.releaseFooter}>
                <span>27 / 09 / 2026</span>
                <span>AXSTORE.IN</span>
              </div>
            </motion.div>

            <motion.div
              className={styles.actions}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.92, duration: 0.46 }}
            >
              {isLive ? (
                <a className={styles.primaryButton} href="/">
                  ENTER AX <span>↗</span>
                </a>
              ) : (
                <button className={styles.primaryButton} type="button" onClick={() => setCalendarOpen(true)}>
                  MARK YOUR CALENDARS <span>↗</span>
                </button>
              )}
              <button className={styles.textButton} type="button" onClick={copyLaunch}>
                {copied ? 'DATE COPIED' : 'COPY LAUNCH DATE'}
              </button>
            </motion.div>
          </section>
        </section>

        <section className={styles.countdownSection} aria-label={isLive ? 'AX is live' : 'Countdown to AX launch'}>
          <div className={styles.countdownHeader}>
            <span>TIME UNTIL PUBLIC RELEASE</span>
            <span>LIVE DATA</span>
          </div>
          {isLive ? (
            <div className={styles.liveMessage}>THE WAIT IS OVER.</div>
          ) : (
            <div className={styles.countdown}>
              <TimeUnit value={countdown.days} label="DAYS" />
              <TimeUnit value={countdown.hours} label="HRS" />
              <TimeUnit value={countdown.minutes} label="MIN" />
              <TimeUnit value={countdown.seconds} label="SEC" />
            </div>
          )}
        </section>

        <footer className={styles.footer}>
          <span>AX / COIMBATORE / 2026</span>
          <strong>THE REST REMAINS ENCRYPTED.</strong>
          <span>PAGE 01 / 01</span>
        </footer>

        <motion.div
          className={styles.cornerMark}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          aria-hidden="true"
        >
          AX
        </motion.div>
      </motion.div>

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
              initial={reduceMotion ? { opacity: 1 } : { y: 42, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { y: 24, opacity: 0 }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.sheetTop}>
                <div>
                  <span>CALENDAR ACCESS / AX-0927</span>
                  <h2 id="calendar-title">MARK YOUR CALENDARS.</h2>
                </div>
                <button type="button" onClick={() => setCalendarOpen(false)} aria-label="Close calendar options">×</button>
              </div>
              <p>Sunday, 27 September 2026 · 12:00 PM IST. The calendar file includes a 15-minute reminder.</p>
              <div className={styles.calendarOptions}>
                <a href={GOOGLE_CALENDAR} target="_blank" rel="noopener noreferrer">
                  <span>GOOGLE CALENDAR</span><span>↗</span>
                </a>
                <a href="/coming-soon/launch.ics">
                  <span>APPLE / OUTLOOK / .ICS</span><span>↓</span>
                </a>
              </div>
              <div className={styles.sheetFooter}>AX INTERNAL DOSSIER · PUBLIC RELEASE REMINDER</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function EncryptedLine({ delay, width }) {
  return (
    <div className={styles.encryptedLine} style={{ width }}>
      <span>9X7A-██-CBE-██-0927</span>
      <motion.i
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay, duration: 0.42, ease: [0.65, 0, 0.35, 1] }}
      />
    </div>
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
