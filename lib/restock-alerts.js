const HANDLE_RE=/^[a-z0-9][a-z0-9-]{0,127}$/;
const VARIANT_RE=/^gid:\/\/shopify\/ProductVariant\/[0-9]+$/;

export function normalizeRestockEmail(value){
  const email=String(value||'').trim().toLowerCase();
  if(email.length<3 || email.length>254) return '';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

export function normalizeRestockHandle(value){
  const handle=String(value||'').trim().toLowerCase();
  return HANDLE_RE.test(handle)?handle:'';
}

export function normalizeRestockVariantId(value){
  const variantId=String(value||'').trim();
  return VARIANT_RE.test(variantId)?variantId:'';
}

export function restockVariantLabel(variant){
  const options=(variant?.selectedOptions||[])
    .filter(option=>option?.name && option?.value && !(option.name==='Title' && option.value==='Default Title'))
    .map(option=>option.name+': '+option.value);
  return options.join(' · ').slice(0,240);
}

export function soldOutVariantForProduct(product,variantId){
  const normalized=normalizeRestockVariantId(variantId);
  if(!normalized || !product || product.demo) return null;
  const variant=(product.variants||[]).find(item=>item?.id===normalized);
  return variant && variant.availableForSale===false ? variant : null;
}
