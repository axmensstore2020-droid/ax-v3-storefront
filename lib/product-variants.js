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
  // A colour is still browsable when the currently selected size is sold out.
  if (isColorOption(name)) for (const key of Object.keys(candidate)) if (isSizeOption(key)) delete candidate[key];
  return variants.some(variant => variant.availableForSale && matchesSelection(variant,candidate));
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
    unitPrice:Number(variant.price?.amount || 0),amount:Number(line.cost.totalAmount.amount),currency:line.cost.totalAmount.currencyCode};
}
