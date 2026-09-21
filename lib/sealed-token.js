import 'server-only';
import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';

const keyFor=secret=>createHash('sha256').update(String(secret)).digest();

export function sealEncryptedToken(value,secret,prefix='v1'){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',keyFor(secret),iv);
  const encrypted=Buffer.concat([cipher.update(Buffer.from(JSON.stringify(value))),cipher.final()]);
  return `${prefix}.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function unsealEncryptedToken(token,secret,{prefix='v1',minLength=20,maxLength=12000,validate=value=>value && Number(value.exp)>Date.now()}={}){
  if(typeof token!=='string' || token.length<minLength || token.length>maxLength || !secret)return null;
  const parts=token.split('.');
  if(parts.length!==4 || parts[0]!==prefix)return null;
  try{
    const iv=Buffer.from(parts[1],'base64url'),tag=Buffer.from(parts[2],'base64url'),data=Buffer.from(parts[3],'base64url');
    if(iv.length!==12 || tag.length!==16 || !data.length)return null;
    const decipher=createDecipheriv('aes-256-gcm',keyFor(secret),iv);decipher.setAuthTag(tag);
    const value=JSON.parse(Buffer.concat([decipher.update(data),decipher.final()]).toString());
    return validate(value)?value:null;
  }catch{return null;}
}
