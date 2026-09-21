import 'server-only';
import {createDatabase,databaseConfigured} from './stylist/database.js';

function bounded(value,fallback,min,max){
  const number=Number(value);
  return Number.isInteger(number)&&number>=min&&number<=max?number:fallback;
}

export async function reserveProviderBudget(bucket,{limit,windowSeconds=86400,env=process.env}={}){
  if(!databaseConfigured(env)) return {allowed:true,enforced:false};
  const safeLimit=bounded(limit,1000,1,100000);
  const safeWindow=bounded(windowSeconds,86400,60,86400);
  try{
    const allowed=await createDatabase(env).reserveBudget(String(bucket||''),safeLimit,safeWindow);
    return {allowed:Boolean(allowed),enforced:true};
  }catch{
    // When the shared guard is configured, fail closed rather than risk an
    // unbounded provider bill during a database/control-plane outage.
    return {allowed:false,enforced:true};
  }
}
