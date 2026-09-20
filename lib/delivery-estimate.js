const DAY_MS=24*60*60*1000;
const IST_ZONE='Asia/Kolkata';

function positiveInt(value,fallback){
  const number=Math.ceil(Number(value));
  return Number.isFinite(number)&&number>0&&number<=30?number:fallback;
}

function istParts(now){
  const date=now instanceof Date?now:new Date(now);
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:IST_ZONE,year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(date);
  const map=Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  return {year:Number(map.year),month:Number(map.month),day:Number(map.day),hour:Number(map.hour),minute:Number(map.minute)};
}

function isoDateFromUtc(date){
  return date.toISOString().slice(0,10);
}

export function axDispatchDate(now=new Date()){
  const {year,month,day,hour}=istParts(now);
  const date=new Date(Date.UTC(year,month-1,day));
  if(hour>=10) date.setUTCDate(date.getUTCDate()+1);
  return isoDateFromUtc(date);
}

export function addCalendarDays(isoDate,days){
  const match=String(isoDate||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match) return '';
  const date=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])));
  date.setUTCDate(date.getUTCDate()+positiveInt(days,0));
  return isoDateFromUtc(date);
}

export function buildCustomerDeliveryEstimate({minDays,maxDays,isOda=false,source='delhivery',now=new Date(),env=process.env}={}){
  const carrierMin=positiveInt(minDays,null);
  const carrierMax=positiveInt(maxDays,carrierMin);
  const fallbackDefault=isOda?10:7;
  const fallback=positiveInt(isOda?env.AX_DELIVERY_ODA_MAX_DAYS:env.AX_DELIVERY_FALLBACK_MAX_DAYS,fallbackDefault);
  const effectiveMax=carrierMax||fallback;
  const dispatchDate=axDispatchDate(now);
  return {
    minDays:carrierMin,
    maxDays:effectiveMax,
    source:carrierMin||carrierMax?source:'ax_fallback',
    dispatchDate,
    earliestDate:carrierMin?addCalendarDays(dispatchDate,carrierMin):null,
    latestDate:addCalendarDays(dispatchDate,effectiveMax)
  };
}
