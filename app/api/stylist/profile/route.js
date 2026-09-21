import {json,stylistConfigured,reserveRequest} from '../../../../lib/stylist/http.js';
import {getSession,sameOrigin} from '../../../../lib/stylist/security.js';
import {createDatabase,databaseConfigured} from '../../../../lib/stylist/database.js';
import {normalizeProfile,CONSENT_VERSION} from '../../../../lib/stylist/validation.js';
import {readLimitedJson} from '../../../../lib/request-body.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const storageReady = () => databaseConfigured() && (process.env.AX_STYLIST_SECRET || '').length >= 32;
export async function GET(request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ok:false,error:'Use the AX store.'},403);
  if (!storageReady()) return json({ok:true,profile:null});
  const session = getSession(request,process.env.AX_STYLIST_SECRET,false);
  if (!session) return json({ok:true,profile:null});
  try { return json({ok:true,profile:await createDatabase().getProfile(session.id)}); }
  catch { return json({ok:false,error:'Your saved profile could not be loaded. Please try again.'},502); }
}
export async function POST(request) {
  if (!sameOrigin(request,process.env.AX_SITE_ORIGIN)) return json({ok:false,error:'Use the AX store.'},403);
  if (!stylistConfigured()) return json({ok:false,error:'Saving a style profile is not enabled yet.'},503);
  let profile;
  try {
    const body = await readLimitedJson(request,5000);
    if (body?.consent !== true || body?.consentVersion !== CONSENT_VERSION) throw new Error('Please agree to save your measurements and preferences.');
    profile = normalizeProfile(body.profile);
  } catch (error) { return json({ok:false,error:error.message},400); }
  let session;
  try {
    const reservation = await reserveRequest(request); session = reservation.session;
    if (reservation.error) return reservation.error;
    await createDatabase().saveProfile(session.id,profile);
    return json({ok:true,profile},200,session);
  } catch { return json({ok:false,error:'Your profile was not saved. Please try again.'},502,session); }
}
export async function DELETE(request) {
  if (!sameOrigin(request,process.env.AX_SITE_ORIGIN)) return json({ok:false,error:'Use the AX store.'},403);
  if (!storageReady()) return json({ok:false,error:'Profile storage is unavailable. Contact AX for deletion help.'},503);
  const session = getSession(request,process.env.AX_STYLIST_SECRET,false);
  try {
    if (session) await createDatabase().deleteProfile(session.id);
    // Keep the anonymous rate-limit cookie; deleting a profile cannot reset quotas.
    return json({ok:true});
  } catch { return json({ok:false,error:'The saved profile could not be deleted. Please try again or email AX.'},502); }
}
