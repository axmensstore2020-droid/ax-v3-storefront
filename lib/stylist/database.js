import 'server-only';
import {hash} from './security.js';
import {CONSENT_VERSION,normalizeProfile} from './validation.js';

export function databaseConfigured(env = process.env) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.SUPABASE_URL || '') && Boolean(supabaseServerKey(env));
}
// Supabase now labels the server-only credential "Secret key". Keep the
// legacy service_role variable as a migration fallback for existing hosts.
export function supabaseServerKey(env = process.env) {
  return env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
}
export function createDatabase(env = process.env,fetcher = fetch) {
  async function call(path,method='GET',body) {
    if (!databaseConfigured(env)) throw new Error('Stylist database is not configured.');
    const key = supabaseServerKey(env);
    const response = await fetcher(env.SUPABASE_URL+'/rest/v1/'+path,{
      method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation,resolution=merge-duplicates'},
      ...(body === undefined ? {} : {body:JSON.stringify(body)}),cache:'no-store',signal:AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error('Stylist data service unavailable.');
    if (response.status === 204) return null;
    const text = await response.text(); return text ? JSON.parse(text) : null;
  }
  const id = session => hash('profile:'+session,env.AX_STYLIST_SECRET);
  return {
    // Atomic global and visitor ceilings, shared by all hosting instances.
    reserve:async(session,ipHash=null) => call('rpc/ax_stylist_reserve','POST',{
      p_visitor:hash('visitor:'+session,env.AX_STYLIST_SECRET),p_ip:ipHash,
      p_hour_limit:boundedInt(env.AX_STYLIST_VISITOR_HOURLY_LIMIT,12,1,100),
      p_day_limit:boundedInt(env.AX_STYLIST_DAILY_LIMIT,150,1,10000)
    }),
    getProfile:async session => {
      const rows = await call('ax_stylist_profiles?id=eq.'+id(session)+'&select=profile,expires_at&expires_at=gt.'+encodeURIComponent(new Date().toISOString()));
      return rows?.[0] ? normalizeProfile(rows[0].profile) : null;
    },
    saveProfile:async(session,profile) => call('ax_stylist_profiles','POST',{
      id:id(session),profile:normalizeProfile(profile),consent_version:CONSENT_VERSION,
      updated_at:new Date().toISOString(),expires_at:new Date(Date.now()+30*86400000).toISOString()
    }),
    deleteProfile:async session => call('ax_stylist_profiles?id=eq.'+id(session),'DELETE')
  };
}
function boundedInt(value,fallback,min,max) {
  const number = Number(value); return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}
