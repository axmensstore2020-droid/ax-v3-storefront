import 'server-only';
import {createHash,timingSafeEqual} from 'node:crypto';
import {sealEncryptedToken,unsealEncryptedToken} from './sealed-token.js';

export const STORE_PREVIEW_COOKIE='ax_store_preview';
export const STORE_PREVIEW_HINT_COOKIE='ax_store_preview_hint';
export const STORE_PREVIEW_EXPIRES_MS=Date.parse('2026-10-01T10:30:00.000Z');
const STORE_PREVIEW_KEY_SHA256='08c60e1c74177ed0cc17f434ff6744dc87543d4bc557ef05468ec49081e21205';

const previewSecret=(env=process.env)=>String(env.AX_PREVIEW_SECRET||env.AX_PLAYROOM_SECRET||env.AX_STYLIST_SECRET||'');

export function storePreviewConfigured(env=process.env){
  return previewSecret(env).length>=32;
}

export function storePreviewKeyValid(value){
  if(typeof value!=='string'||value.length<20||value.length>160)return false;
  const actual=createHash('sha256').update(value).digest();
  const expected=Buffer.from(STORE_PREVIEW_KEY_SHA256,'hex');
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}

export function createStorePreviewToken({env=process.env,now=Date.now()}={}){
  const secret=previewSecret(env);
  if(secret.length<32||now>=STORE_PREVIEW_EXPIRES_MS)return null;
  return sealEncryptedToken({
    kind:'store-preview',
    iat:now,
    exp:STORE_PREVIEW_EXPIRES_MS
  },secret,'axp1');
}

export function storePreviewTokenValid(token,{env=process.env,now=Date.now()}={}){
  const secret=previewSecret(env);
  if(secret.length<32||now>=STORE_PREVIEW_EXPIRES_MS)return false;
  return Boolean(unsealEncryptedToken(token,secret,{
    prefix:'axp1',
    minLength:30,
    maxLength:4000,
    validate:value=>value?.kind==='store-preview'&&Number(value.exp)===STORE_PREVIEW_EXPIRES_MS&&Number(value.exp)>now
  }));
}
