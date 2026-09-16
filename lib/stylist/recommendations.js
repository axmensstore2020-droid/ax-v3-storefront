import {isSizeOption,matchesSelection,variantHref} from '../product-variants.js';
export function recommendationCard(product,choice,{productHandle='',selectedOptions={}}={}) {
  if (!product || product.demo || !product.availableForSale) return null;
  const options=choice.selectedOptions?.length ? choice.selectedOptions : productHandle===product.handle ? Object.entries(selectedOptions).map(([name,value])=>({name,value})) : [];
  if (options.length>3 || options.some(o=>!o || typeof o.name!=='string'||typeof o.value!=='string'||['__proto__','prototype','constructor'].includes(o.name))) return null;
  const selected=Object.fromEntries(options.map(o=>[o.name,o.value]));
  let variant=choice.variantId ? product.variants?.find(v=>v.id===choice.variantId) : null;
  if (choice.variantId && (!variant || !matchesSelection(variant,selected))) return null;
  if (!variant && options.length) variant=product.variants?.find(v=>v.availableForSale && matchesSelection(v,selected));
  if (options.length && !variant) return null;
  if (variant && (!variant.availableForSale || (productHandle===product.handle && !matchesSelection(variant,selectedOptions)))) return null;
  const sizes=product.options?.filter(o=>isSizeOption(o.name)&&o.values?.length>1) || [];
  // A colour recommendation must not silently choose the first size. Fit remains
  // an estimate; customers confirm their size on the product page.
  const chooseSize=Boolean(variant && sizes.some(o=>!selectedOptions[o.name] || productHandle!==product.handle));
  const href=variant?variantHref(product.handle,variant.id)+(chooseSize?'&chooseSize=1':''):product.href;
  return {handle:product.handle,title:product.title,productNumber:product.productNumber,
    variantId:variant?.id || null,selectedOptions:variant?.selectedOptions || [],requiresSize:chooseSize,
    image:variant?.image || product.image,price:variant?.price || product.price,href:href || '/products/'+encodeURIComponent(product.handle)};
}
