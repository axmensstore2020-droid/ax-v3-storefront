import 'server-only';
import {isIP} from 'node:net';
import {databaseConfigured,createDatabase} from './database.js';
import {getSession,hash,SESSION_COOKIE,SESSION_SECONDS} from './security.js';
import {shopifyConfigured} from '../shopify.js';
import {sendStylistQuotaAlert,stylistAlertConfigured} from './alerts.js';

export function stylistConfigured(env = process.env) {
  let validOrigin = false;
  try { const url = new URL(env.AX_SITE_ORIGIN); validOrigin = url.origin === env.AX_SITE_ORIGIN && (url.protocol === 'https:' || (env.NODE_ENV !== 'production' && url.hostname === 'localhost')); } catch {}
  return env.AX_STYLIST_ENABLED === 'true' && Boolean(env.OPENAI_API_KEY) && (env.AX_STYLIST_SECRET || '').length >= 32 && validOrigin && databaseConfigured(env) && shopifyConfigured();
}
export function json(data,status=200,session=null) {
  const headers = {'Content-Type':'application/json','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'};
  if (session?.token) headers['Set-Cookie'] = `${SESSION_COOKIE}=${session.token}; HttpOnly; SameSite=Strict; Path=/api/stylist; Max-Age=${SESSION_SECONDS}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  return new Response(JSON.stringify(data),{status,headers});
}
async function sendQuotaAlert(db,reservation) {
  if(!reservation || !['warning','limit'].includes(reservation.alert) || !reservation.alertKey) return;
  const date=String(reservation.alertKey).split(':').at(-1) || '';
  if(!stylistAlertConfigured()) {
    console.warn('[AX Stylist] quota alert triggered but email delivery is not configured.',{level:reservation.alert,dailyUsed:reservation.dailyUsed,dailyLimit:reservation.dailyLimit});
    try {await db.releaseAlert(reservation.alertKey);} catch {}
    return;
  }
  try {
    await sendStylistQuotaAlert({
      level:reservation.alert,
      used:reservation.dailyUsed,
      limit:reservation.dailyLimit,
      warningPercent:Number(process.env.AX_STYLIST_ALERT_WARNING_PERCENT)||80,
      date
    });
  } catch {
    console.warn('[AX Stylist] quota alert email failed.',{level:reservation.alert,dailyUsed:reservation.dailyUsed,dailyLimit:reservation.dailyLimit});
    // Release the one-shot marker so a later request can retry delivery.
    try {await db.releaseAlert(reservation.alertKey);} catch {}
  }
}

export async function reserveRequest(request) {
  const session = getSession(request,process.env.AX_STYLIST_SECRET);
  const ipHeader = process.env.AX_STYLIST_IP_HEADER;
  const ip = ipHeader ? request.headers.get(ipHeader)?.trim() : null;
  const ipHash = ip && isIP(ip) ? hash('ip:'+ip,process.env.AX_STYLIST_SECRET) : null;
  const db=createDatabase();
  const reservation = await db.reserve(session.id,ipHash);
  // Temporary rollback compatibility if an older database function is in use.
  if(reservation === true) return {session};
  await sendQuotaAlert(db,reservation);
  if(reservation?.allowed === true) return {session,quota:reservation};
  const hourly=['visitor_hourly','ip_hourly'].includes(reservation?.reason);
  if(hourly) return {session,error:json({
    ok:false,code:'STYLIST_HOURLY_LIMIT',
    error:'You’ve used your AX Stylist allowance for this hour. Try again shortly.'
  },429,session)};
  return {session,error:json({
    ok:false,code:'STYLIST_DAILY_LIMIT',
    error:'AX Stylist is taking a short break after reaching today’s shared limit. It’ll be back after the daily reset.'
  },429,session)};
}
