import {variantWeightGrams} from './weight.js';

// VARIANT CONTRACT
// Shopify product/variant options are the only source of sellable sizes and colours.
// Measurement-chart rows must never create variants. A multi-size PDP intentionally
// opens without silently choosing a size unless a specific variant was requested.
export const isSizeOption = name => /\bsize\b/i.test(name);
export const isColorOption = name => /^colou?r$/i.test(name.trim());

// Read actual Shopify options only. A measurement chart is not sellable stock.
export function productOptions(product) {
  const options = new Map();
  for (const option of product.options || []) {
    const values = option.optionValues?.map(value => value.name) || option.values || [];
    options.set(option.name, new Set(values.filter(value => typeof value === 'string')));
  }
  for (const variant of product.variants || []) for (const option of variant.selectedOptions || []) {
    if (!options.has(option.name)) options.set(option.name, new Set());
    options.get(option.name).add(option.value);
  }
  return [...options].map(([name, values]) => ({name, values:[...values]}));
}
export const visibleOptions = options => options.filter(option => !(option.name === 'Title' && option.values.length === 1 && option.values[0] === 'Default Title'));
export const matchesSelection = (variant, selected) => Object.entries(selected).every(([name,value]) => (variant.selectedOptions || []).some(option => option.name === name && option.value === value));
export function initialSelection(product, variantId, chooseSize=false) {
  const variants = product.variants || [];
  const requested = variants.find(variant => variant.id === variantId || variant.id.split('/').at(-1) === variantId);
  const variant = requested || variants.find(item => item.availableForSale) || variants[0];
  const selected = Object.fromEntries((variant?.selectedOptions || []).map(option => [option.name,option.value]));
  if ((!requested || chooseSize)) for (const option of productOptions(product)) {
    if (isSizeOption(option.name) && option.values.length > 1) delete selected[option.name];
  }
  return selected;
}
export function optionAvailable(variants, selected, name, value) {
  const candidate = {...selected,[name]:value};
  // A colour remains browsable when the currently selected size is unavailable;
  // selecting that colour will clear the stale size below.
  if (isColorOption(name)) for (const key of Object.keys(candidate)) if (isSizeOption(key)) delete candidate[key];
  return variants.some(variant => variant.availableForSale && matchesSelection(variant,candidate));
}

export function selectionAfterOption(variants,selected,name,value) {
  const current={...(selected || {})};
  if(!value){delete current[name];return current;}
  const candidate={...current,[name]:value};
  if(variants.some(variant=>variant.availableForSale && matchesSelection(variant,candidate))) return candidate;

  // Colour changes are allowed when that colour has stock in another size.
  // Never leave a stale size selected against an impossible colour/size pair.
  if(isColorOption(name)){
    for(const key of Object.keys(candidate)) if(isSizeOption(key)) delete candidate[key];
    if(variants.some(variant=>variant.availableForSale && matchesSelection(variant,candidate))) return candidate;
  }
  return current;
}

const normalizedOption=value=>String(value || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const variantOption=(variant,pattern)=>(variant?.selectedOptions || []).find(option=>pattern.test(option?.name || ''))?.value || '';

export function availableOptionValues(product,pattern) {
  const variants=product?.variants || [];
  if(variants.length){
    const values=variants.filter(variant=>variant.availableForSale).map(variant=>variantOption(variant,pattern)).filter(Boolean);
    return [...new Set(values)];
  }
  if(product?.availableForSale===false) return [];
  const option=(product?.options || []).find(item=>pattern.test(item?.name || ''));
  return option?.values || option?.optionValues?.map(value=>value.name) || [];
}

export function productMatchesAvailableFilters(product,{size='',color=''}={}) {
  const wantedSize=normalizedOption(size),wantedColor=normalizedOption(color);
  const productColors=String(product?.color || '').split(',').map(normalizedOption).filter(Boolean);
  const variants=product?.variants || [];

  if(variants.length){
    const available=variants.filter(variant=>variant.availableForSale);
    if(!available.length) return false;
    return available.some(variant=>{
      if(wantedSize && normalizedOption(variantOption(variant,/size/i))!==wantedSize) return false;
      if(wantedColor){
        const variantColor=normalizedOption(variantOption(variant,/^colou?r$/i));
        if(variantColor){
          if(variantColor!==wantedColor) return false;
        }else if(!productColors.some(value=>value===wantedColor || value.includes(wantedColor) || wantedColor.includes(value))) return false;
      }
      return true;
    });
  }

  if(product?.availableForSale===false) return false;
  if(wantedSize && !availableOptionValues(product,/size/i).some(value=>normalizedOption(value)===wantedSize)) return false;
  if(wantedColor){
    const values=[...availableOptionValues(product,/^colou?r$/i),...productColors];
    if(!values.some(value=>{
      const normalized=normalizedOption(value);
      return normalized===wantedColor || normalized.includes(wantedColor) || wantedColor.includes(normalized);
    })) return false;
  }
  return true;
}
export function selectionImage(product, selected, variant) {
  if (variant?.image?.url) return variant.image;
  const colors = Object.fromEntries(Object.entries(selected).filter(([name]) => isColorOption(name)));
  const matching = (product.variants || []).find(item => item.image?.url && matchesSelection(item,selected))
    || (Object.keys(colors).length ? (product.variants || []).find(item => item.image?.url && matchesSelection(item,colors)) : null);
  return matching?.image || (product.image ? {url:product.image,altText:product.imageAlt || product.title} : product.images?.[0]);
}
export function variantHref(handle, variantId) {
  const path = '/products/'+encodeURIComponent(handle);
  const id = String(variantId || '').match(/^gid:\/\/shopify\/ProductVariant\/(\d+)$/)?.[1];
  return id ? path+'?variant='+id : path;
}
export function cartLineDetails(line) {
  const variant = line.merchandise, product = variant.product;
  const options = (variant.selectedOptions || []).filter(option => !(option.name === 'Title' && option.value === 'Default Title'));
  return {id:line.id,merchandiseId:variant.id,quantity:line.quantity,title:product.title,handle:product.handle,
    href:variantHref(product.handle,variant.id),image:variant.image?.url || product.featuredImage?.url,
    variant:options.length ? options.map(option => option.name+': '+option.value).join(' · ') : variant.title === 'Default Title' ? '' : variant.title,
    unitPrice:Number(variant.price?.amount || 0),amount:Number(line.cost.totalAmount.amount),currency:line.cost.totalAmount.currencyCode,
    weightGrams:variantWeightGrams(variant),requiresShipping:variant.requiresShipping!==false};
}
