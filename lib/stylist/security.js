import 'server-only';
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {MAX_IMAGE_BYTES} from './validation.js';
import {stylistConfig} from './config.js';
import {boundedHistory,compactContext} from './context.js';


const MAX_IMAGE_DIMENSION=4096;
const MAX_IMAGE_PIXELS=16_000_000;
const read24LE=(bytes,offset)=>bytes[offset] | (bytes[offset+1]<<8) | (bytes[offset+2]<<16);
function imageDimensions(bytes,type) {
  if(type==='png') {
    if(bytes.length<24 || bytes.toString('ascii',12,16)!=='IHDR') return null;
    return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
  }
  if(type==='jpeg') {
    let offset=2;
    const sof=new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
    while(offset+4<=bytes.length) {
      if(bytes[offset]!==0xff){offset++;continue;}
      while(offset<bytes.length && bytes[offset]===0xff)offset++;
      const marker=bytes[offset++];
      if(marker===0xd8 || marker===0xd9)continue;
      if(marker===0xda)break;
      if(offset+2>bytes.length)break;
      const length=bytes.readUInt16BE(offset);
      if(length<2 || offset+length>bytes.length)break;
      if(sof.has(marker) && length>=7) return {height:bytes.readUInt16BE(offset+3),width:bytes.readUInt16BE(offset+5)};
      offset+=length;
    }
    return null;
  }
  if(type==='webp') {
    if(bytes.length<30 || bytes.toString('ascii',0,4)!=='RIFF' || bytes.toString('ascii',8,12)!=='WEBP') return null;
    const chunk=bytes.toString('ascii',12,16);
    if(chunk==='VP8X') return {width:1+read24LE(bytes,24),height:1+read24LE(bytes,27)};
    if(chunk==='VP8 ' && bytes.length>=30 && bytes[23]===0x9d && bytes[24]===0x01 && bytes[25]===0x2a) {
      return {width:bytes.readUInt16LE(26)&0x3fff,height:bytes.readUInt16LE(28)&0x3fff};
    }
    if(chunk==='VP8L' && bytes.length>=25 && bytes[20]===0x2f) {
      return {width:1+(((bytes[22]&0x3f)<<8)|bytes[21]),height:1+(((bytes[24]&0x0f)<<10)|(bytes[23]<<2)|((bytes[22]&0xc0)>>6))};
    }
    return null;
  }
  return null;
}

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
export function conversationContext(token,sessionId,secret) {
  if (!token) return {id:randomUUID(),summary:''};
  historyFromToken(token,sessionId,secret);
  const value=unseal(token,secret);
  return {id:typeof value.conversationId==='string'?value.conversationId:randomUUID(),summary:String(value.summary || '').slice(-700)};
}
export function historyToken(messages,sessionId,secret,context={},config=stylistConfig()) {
  const safe=boundedHistory(messages,config), summary=compactContext(context.summary,messages,config);
  const value={kind:'conversation',sessionId,conversationId:context.id || randomUUID(),summary,messages:safe,exp:Date.now()+60*60*1000};
  // Multibyte languages must also fit the signed-token request limit.
  while(Buffer.byteLength(JSON.stringify(value))>16000 && safe.length>1) safe.shift();
  return seal(value,secret);
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
  const dimensions=imageDimensions(bytes,match[1]);
  if(!dimensions || !Number.isInteger(dimensions.width) || !Number.isInteger(dimensions.height) || dimensions.width<1 || dimensions.height<1) throw new Error('The image file is malformed.');
  if(dimensions.width>MAX_IMAGE_DIMENSION || dimensions.height>MAX_IMAGE_DIMENSION || dimensions.width*dimensions.height>MAX_IMAGE_PIXELS) throw new Error('The image dimensions are too large.');
  return data;
}
