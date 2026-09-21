import 'server-only';
import {createHmac,randomBytes} from 'node:crypto';

export const RESTOCK_VERIFICATION_MAX_AGE=24*60*60;

export function normalizeRestockVerificationToken(value){
  const token=String(value || '').trim();
  return /^[A-Za-z0-9_-]{40,100}$/.test(token)?token:'';
}

export function restockVerificationHash(token,secret){
  const safe=normalizeRestockVerificationToken(token);
  if(!safe || !secret || String(secret).length<32)return '';
  return createHmac('sha256',String(secret)).update('restock-verify:'+safe).digest('hex');
}

export function createRestockVerification(secret,now=Date.now()){
  if(!secret || String(secret).length<32)throw new Error('Restock verification is not configured.');
  const token=randomBytes(32).toString('base64url');
  return {token,hash:restockVerificationHash(token,secret),expiresAt:new Date(now+RESTOCK_VERIFICATION_MAX_AGE*1000).toISOString()};
}
