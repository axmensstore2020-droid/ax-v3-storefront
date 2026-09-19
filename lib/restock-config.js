import 'server-only';
import {databaseConfigured} from './stylist/database.js';
import {restockEmailConfigured} from './restock-email.js';

export function restockSecret(env=process.env){
  return String(env.AX_RESTOCK_SECRET || env.AX_STYLIST_SECRET || '');
}

export function restockProcessorConfigured(env=process.env){
  return databaseConfigured(env)
    && restockSecret(env).length>=32
    && String(env.AX_RESTOCK_PROCESSOR_SECRET||'').length>=32
    && restockEmailConfigured(env);
}

export function restockAlertSignupConfigured(env=process.env){
  return env.AX_RESTOCK_ALERTS_ENABLED==='true'
    && restockProcessorConfigured(env);
}
