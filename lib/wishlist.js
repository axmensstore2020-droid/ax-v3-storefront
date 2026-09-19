const HANDLE_RE=/^[a-z0-9][a-z0-9-]{0,127}$/;
export const WISHLIST_KEY='ax_wishlist_v1';
export const WISHLIST_EVENT='ax:wishlist-change';
export const WISHLIST_LIMIT=40;

export function normalizeWishlist(value,limit=WISHLIST_LIMIT){
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

export function readWishlist(){
  if(typeof window==='undefined') return [];
  try{
    return normalizeWishlist(JSON.parse(window.localStorage.getItem(WISHLIST_KEY)||'[]'));
  }catch{
    return [];
  }
}

export function wishlistHas(value,handle){
  const target=String(handle||'').trim().toLowerCase();
  return normalizeWishlist(value).includes(target);
}

export function toggleWishlistValue(value,handle){
  const target=String(handle||'').trim().toLowerCase();
  const current=normalizeWishlist(value);
  if(!HANDLE_RE.test(target)) return current;
  return current.includes(target) ? current.filter(item=>item!==target) : normalizeWishlist([target,...current]);
}

export function writeWishlist(value){
  const next=normalizeWishlist(value);
  if(typeof window==='undefined') return next;
  try{window.localStorage.setItem(WISHLIST_KEY,JSON.stringify(next));}catch{}
  try{window.dispatchEvent(new CustomEvent(WISHLIST_EVENT,{detail:{items:next}}));}catch{}
  return next;
}

export function toggleWishlist(handle){
  return writeWishlist(toggleWishlistValue(readWishlist(),handle));
}
