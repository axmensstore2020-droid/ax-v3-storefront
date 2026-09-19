import 'server-only';
import {databaseConfigured} from './stylist/database.js';

export function restockSecret(env=process.env){
  return String(env.AX_RESTOCK_SECRET || env.AX_STYLIST_SECRET || '');
}

export function restockAlertSignupConfigured(env=process.env){
  return env.AX_RESTOCK_ALERTS_ENABLED==='true'
    && databaseConfigured(env)
    && restockSecret(env).length>=32;
}
