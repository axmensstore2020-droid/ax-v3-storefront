import 'server-only';
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {MAX_IMAGE_BYTES} from './validation.js';

export const SESSION_COOKIE = 'ax_stylist_session';
export const SESSION_SECONDS = 30*24*60*60;
export const hash = (value,secret) => createHmac('sha256',secret).update(value).digest('hex');
export function seal(value,secret) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return payload+'.'+hash(payload,secret);
}
export function unseal(token,secret) {
  if (typeof token !== 'string' || token.length > 24000) return null;
  const [payload,signature,...extra] = token.split('.');
  if (extra.length || !payload || !/^[a-f0-9]{64}$/.test(signature || '')) return null;
  if (!timingSafeEqual(Buffer.from(signature),Buffer.from(hash(payload,secret)))) return null;
  try { const value = JSON.parse(Buffer.from(payload,'base64url').toString()); return value.exp > Date.now() ? value : null; } catch { return null; }
}
export function getSession(request,secret,create = true) {
  const token = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(SESSION_COOKIE+'='))?.slice(SESSION_COOKIE.length+1);
  const existing = unseal(token,secret);
  if (existing?.kind === 'session' && /^[a-f0-9-]{36}$/.test(existing.id)) return {id:existing.id,token:create ? seal({kind:'session',id:existing.id,exp:Date.now()+SESSION_SECONDS*1000},secret) : null};
  if (!create) return null;
  const id = randomUUID();
  return {id,token:seal({kind:'session',id,exp:Date.now()+SESSION_SECONDS*1000},secret)};
}
export function historyFromToken(token,sessionId,secret) {
  if (!token) return [];
  const value = unseal(token,secret);
  if (value?.kind !== 'conversation' || value.sessionId !== sessionId || !Array.isArray(value.messages)) throw new Error('This chat expired. Start a new conversation.');
  return value.messages;
}
export function historyToken(messages,sessionId,secret) {
  const safe = messages.slice(-6).map(({role,content}) => ({role,content:String(content).slice(0,1200)}));
  return seal({kind:'conversation',sessionId,messages:safe,exp:Date.now()+60*60*1000},secret);
}
export function sameOrigin(request,origin) {
  if (!origin) return false;
  try { return new URL(origin).origin === origin && request.headers.get('origin') === origin && request.headers.get('sec-fetch-site') !== 'cross-site'; } catch { return false; }
}
export function validateImage(data) {
  if (!data) return '';
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match) throw new Error('Use a JPEG, PNG or WebP image, not a link.');
  const bytes = Buffer.from(match[2],'base64');
  if (bytes.length < 12 || bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== match[2]) throw new Error('Invalid image or image larger than 1.5 MB.');
  const valid = match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : match[1] === 'png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
  if (!valid) throw new Error('The file does not match its image type.');
  return data;
}
