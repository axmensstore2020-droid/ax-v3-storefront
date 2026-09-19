const HANDLE_RE=/^[a-z0-9][a-z0-9-]{0,127}$/;
export const RECENTLY_VIEWED_KEY='ax_recently_viewed_v1';
export const RECENTLY_VIEWED_LIMIT=8;

export function normalizeRecentlyViewed(value,limit=RECENTLY_VIEWED_LIMIT){
  const list=Array.isArray(value)?value:[];
  const seen=new Set(),out=[];
  for(const item of list){
    const handle=String(item||'').trim().toLowerCase();
    if(!HANDLE_RE.test(handle) || seen.has(handle)) continue;
    seen.add(handle);
    out.push(handle);
    if(out.length>=limit) break;
  }
  return out;
}

export function addRecentlyViewed(value,handle,limit=RECENTLY_VIEWED_LIMIT){
  const next=String(handle||'').trim().toLowerCase();
  if(!HANDLE_RE.test(next)) return normalizeRecentlyViewed(value,limit);
  return normalizeRecentlyViewed([next,...(Array.isArray(value)?value:[])],limit);
}

export function readRecentlyViewed(){
  if(typeof window==='undefined') return [];
  try{
    return normalizeRecentlyViewed(JSON.parse(window.localStorage.getItem(RECENTLY_VIEWED_KEY)||'[]'));
  }catch{
    return [];
  }
}

export function rememberRecentlyViewed(handle){
  if(typeof window==='undefined') return [];
  const next=addRecentlyViewed(readRecentlyViewed(),handle);
  try{window.localStorage.setItem(RECENTLY_VIEWED_KEY,JSON.stringify(next));}catch{}
  return next;
}
