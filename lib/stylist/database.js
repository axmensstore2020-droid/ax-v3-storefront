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
    // New Secret keys are opaque API keys, not bearer JWTs. Legacy service_role
    // JWTs keep their Authorization header for existing deployments.
    const authorization = key.startsWith('sb_secret_') ? {} : {Authorization:'Bearer '+key};
    const response = await fetcher(env.SUPABASE_URL+'/rest/v1/'+path,{
      method,headers:{apikey:key,...authorization,'Content-Type':'application/json',Prefer:'return=representation,resolution=merge-duplicates'},
      ...(body === undefined ? {} : {body:JSON.stringify(body)}),cache:'no-store',signal:AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error('Stylist data service unavailable.');
    if (response.status === 204) return null;
    const text = await response.text(); return text ? JSON.parse(text) : null;
  }
  const id = session => hash('profile:'+session,env.AX_STYLIST_SECRET);
  const whatsappId = customerId => hash('whatsapp:'+customerId,env.AX_STYLIST_SECRET);
  const restockSecret = () => String(env.AX_RESTOCK_SECRET || env.AX_STYLIST_SECRET || '');
  const restockId = (email,variantId) => hash('restock:'+String(email).toLowerCase()+'|'+variantId,restockSecret());
  return {
    // Atomic global and visitor ceilings, shared by all hosting instances.
    // v2 returns the exact blocking reason plus one-shot 80%/100% alert markers.
    reserve:async(session,ipHash=null) => call('rpc/ax_stylist_reserve_v2','POST',{
      p_visitor:hash('visitor:'+session,env.AX_STYLIST_SECRET),p_ip:ipHash,
      p_hour_limit:boundedInt(env.AX_STYLIST_VISITOR_HOURLY_LIMIT,12,1,100),
      p_day_limit:boundedInt(env.AX_STYLIST_DAILY_LIMIT,150,1,10000),
      p_warning_percent:boundedInt(env.AX_STYLIST_ALERT_WARNING_PERCENT,80,50,99)
    }),
    releaseAlert:async alertKey => call('rpc/ax_stylist_release_alert','POST',{p_alert_key:String(alertKey||'').slice(0,96)}),
    reserveAdvanced:async limit => call('rpc/ax_stylist_reserve_advanced','POST',{p_day_limit:limit}),
    reserveBudget:async(bucket,limit,windowSeconds=86400) => call('rpc/ax_server_budget_reserve','POST',{
      p_bucket:String(bucket||'').slice(0,64),p_limit:boundedInt(limit,1000,1,100000),p_window_seconds:boundedInt(windowSeconds,86400,60,86400)
    }),
    writeUsage:async records => call('ax_stylist_usage','POST',records),
    writeStoreEvent:async record => call('ax_store_events','POST',record),
    saveRestockSubscription:async({email,productHandle,variantId,variantLabel='',verificationHash='',verificationExpiresAt=''}) => {
      const now=new Date().toISOString();
      return call('ax_restock_subscriptions','POST',{
        id:restockId(email,variantId),email:String(email).toLowerCase(),product_handle:productHandle,variant_id:variantId,
        variant_label:String(variantLabel||'').slice(0,240),status:'unverified',requested_at:now,updated_at:now,notified_at:null,
        verification_token_hash:String(verificationHash||'').slice(0,64),verification_expires_at:verificationExpiresAt || null,
        attempt_count:0,last_attempt_at:null,last_error:'',provider_message_id:'',
        expires_at:new Date(Date.now()+180*86400000).toISOString()
      });
    },
    confirmRestockSubscription:async verificationHash => {
      const now=new Date().toISOString(),token=String(verificationHash||'');
      if(!/^[a-f0-9]{64}$/.test(token))return null;
      const rows=await call('ax_restock_subscriptions?verification_token_hash=eq.'+token+'&status=eq.unverified&verification_expires_at=gt.'+encodeURIComponent(now),'PATCH',{
        status:'pending',verification_token_hash:'',verification_expires_at:null,updated_at:now
      });
      return rows?.[0] || null;
    },
    listPendingRestockSubscriptions:async(limit=25,now=new Date()) => {
      const safeLimit=boundedInt(limit,25,1,100);
      return await call('ax_restock_subscriptions?status=eq.pending&select=id,email,product_handle,variant_id,variant_label,attempt_count,last_attempt_at,last_error,requested_at,updated_at,expires_at&order=updated_at.asc&limit='+safeLimit) || [];
    },
    markRestockNotified:async(idValue,providerMessageId='') => {
      const now=new Date().toISOString();
      return call('ax_restock_subscriptions?id=eq.'+encodeURIComponent(idValue),'PATCH',{
        status:'notified',notified_at:now,updated_at:now,last_attempt_at:now,last_error:'',
        provider_message_id:String(providerMessageId||'').slice(0,128)
      });
    },
    markRestockAttempt:async(idValue,attemptCount,error='') => {
      const now=new Date().toISOString();
      return call('ax_restock_subscriptions?id=eq.'+encodeURIComponent(idValue),'PATCH',{
        attempt_count:boundedInt(attemptCount,1,1,1000),last_attempt_at:now,updated_at:now,
        last_error:String(error||'').slice(0,500)
      });
    },
    closeRestockSubscription:async(idValue,status='cancelled') => {
      const safeStatus=status==='expired'?'expired':'cancelled';
      return call('ax_restock_subscriptions?id=eq.'+encodeURIComponent(idValue),'PATCH',{
        status:safeStatus,updated_at:new Date().toISOString()
      });
    },
    getWhatsappPreference:async customerId => {
      const rows=await call('ax_whatsapp_preferences?customer_hash=eq.'+whatsappId(customerId)+'&select=phone_e164,opted_in,consent_version,consent_at,revoked_at,updated_at');
      return rows?.[0] || null;
    },
    saveWhatsappPreference:async(customerId,{phoneE164='',optedIn=false,source='account'}={}) => {
      const now=new Date().toISOString();
      return call('ax_whatsapp_preferences','POST',{
        customer_hash:whatsappId(customerId),phone_e164:optedIn?String(phoneE164||''):'',opted_in:Boolean(optedIn),source:String(source||'account').slice(0,32),consent_version:'v1',
        consent_at:optedIn?now:null,revoked_at:optedIn?null:now,updated_at:now
      });
    },
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
