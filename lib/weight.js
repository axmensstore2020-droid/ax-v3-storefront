export function weightToGrams(weight,unit='GRAMS') {
  const value=Number(weight);
  if(!Number.isFinite(value) || value<=0) return null;
  const normalized=String(unit || 'GRAMS').toUpperCase();
  const multiplier={GRAMS:1,KILOGRAMS:1000,OUNCES:28.349523125,POUNDS:453.59237}[normalized];
  if(!multiplier) return null;
  const grams=Math.round(value*multiplier);
  return grams>0 && grams<=100000 ? grams : null;
}

export function variantWeightGrams(variant) {
  if(!variant || variant.requiresShipping===false) return 0;
  return weightToGrams(variant.weight,variant.weightUnit);
}


function variantMatchesSelection(variant,selected={}){
  return Object.entries(selected).every(([name,value])=>{
    if(/\bsize\b/i.test(name)) return true;
    return (variant?.selectedOptions || []).some(option=>option.name===name && option.value===value);
  });
}

// PDPs deliberately open without preselecting a size. Use an available
// matching variant as a conservative weight fallback so delivery checking is
// useful before the shopper chooses a size. The final checkout quote still
// uses the exact cart variants and quantities.
export function deliveryWeightForProduct(product,selected={},exactVariant=null){
  const exact=variantWeightGrams(exactVariant);
  if(exact>0) return exact;
  const variants=(product?.variants || []).filter(variant=>variant?.availableForSale!==false && variantMatchesSelection(variant,selected));
  const weights=variants.map(variantWeightGrams).filter(value=>Number.isFinite(value)&&value>0);
  return weights.length ? Math.max(...weights) : null;
}
