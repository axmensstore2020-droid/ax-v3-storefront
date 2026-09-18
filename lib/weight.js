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
