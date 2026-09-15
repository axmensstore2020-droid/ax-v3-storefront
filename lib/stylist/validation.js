export const MAX_MESSAGE = 1200;
export const MAX_IMAGE_BYTES = 1500000;
export const MAX_BODY_BYTES = 2100000;
export const CONSENT_VERSION = '2026-09-15';
export const PROFILE_FIELDS = ['chest', 'waist', 'hip', 'height', 'inseam'];
const plainObject = value => value && typeof value === 'object' && !Array.isArray(value);

export function normalizeProfile(value = {}) {
  if (!plainObject(value)) throw new Error('Invalid style profile.');
  const unit = value.unit || 'cm';
  if (!['cm', 'inches'].includes(unit)) throw new Error('Choose centimetres or inches.');
  const profile = {unit};
  const limits = {chest:[40,200], waist:[35,200], hip:[40,220], height:[100,230], inseam:[30,120]};
  for (const key of PROFILE_FIELDS) {
    const raw = value[key];
    if (raw === undefined || raw === null || raw === '') continue;
    if (!['number','string'].includes(typeof raw) || !/^\d+(\.\d{1,2})?$/.test(String(raw))) throw new Error('Use numbers for measurements.');
    const number = Number(raw), cm = number * (unit === 'inches' ? 2.54 : 1);
    if (!Number.isFinite(cm) || cm < limits[key][0] || cm > limits[key][1]) throw new Error(`Check your ${key} measurement and unit.`);
    profile[key] = number;
  }
  if (value.fit && !['regular','relaxed','oversized'].includes(value.fit)) throw new Error('Choose a listed fit.');
  profile.fit = value.fit || 'regular';
  for (const key of ['styles','colors','avoid']) {
    if (value[key] !== undefined && typeof value[key] !== 'string') throw new Error('Use text for style preferences.');
    profile[key] = String(value[key] || '').trim().slice(0,180);
  }
  return profile;
}

export function validateChat(value) {
  if (!plainObject(value)) throw new Error('Invalid request.');
  if (value.consent !== true) throw new Error('Please agree to AI processing before sending.');
  if (typeof value.message !== 'string' || !value.message.trim() || value.message.length > MAX_MESSAGE) throw new Error('Write a message of 1–1,200 characters.');
  if (value.image && (typeof value.image !== 'string' || value.image.length > 2000100)) throw new Error('Choose an image smaller than 1.5 MB.');
  if (value.conversation && (typeof value.conversation !== 'string' || value.conversation.length > 24000)) throw new Error('Start a new conversation.');
  const handle = value.productHandle || '';
  if (typeof handle !== 'string' || (handle && !/^[a-z0-9][a-z0-9-]{0,179}$/.test(handle))) throw new Error('Invalid product.');
  const selectedOptions = {};
  if (value.selectedOptions !== undefined && !plainObject(value.selectedOptions)) throw new Error('Invalid product options.');
  for (const [key,option] of Object.entries(value.selectedOptions || {}).slice(0,3)) {
    if (key.length > 50 || typeof option !== 'string' || option.length > 70 || ['__proto__','constructor','prototype'].includes(key)) throw new Error('Invalid product options.');
    selectedOptions[key] = option;
  }
  return {message:value.message.trim(), image:value.image || '', conversation:value.conversation || '', productHandle:handle, selectedOptions, profile:normalizeProfile(value.profile)};
}

export async function readLimitedJson(request, maxBytes = MAX_BODY_BYTES) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('Send JSON.');
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new Error('Request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Empty request.');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error('Request is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('Invalid JSON.'); }
}
