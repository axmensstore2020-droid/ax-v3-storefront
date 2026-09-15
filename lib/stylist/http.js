import 'server-only';
import {isIP} from 'node:net';
import {databaseConfigured,createDatabase} from './database.js';
import {getSession,hash,SESSION_COOKIE,SESSION_SECONDS} from './security.js';
import {shopifyConfigured} from '../shopify.js';

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
export async function reserveRequest(request) {
  const session = getSession(request,process.env.AX_STYLIST_SECRET);
  const ipHeader = process.env.AX_STYLIST_IP_HEADER;
  const ip = ipHeader ? request.headers.get(ipHeader)?.trim() : null;
  const ipHash = ip && isIP(ip) ? hash('ip:'+ip,process.env.AX_STYLIST_SECRET) : null;
  const allowed = await createDatabase().reserve(session.id,ipHash);
  if (allowed !== true) return {session,error:json({ok:false,error:'AX Stylist has reached its message limit. Please try later or contact AX.'},429,session)};
  return {session};
}
