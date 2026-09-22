const dimensions = ['chest','waist','hip','inseam'];
const unitFactor = unit => unit === 'cm' ? 1 : ['inches','in'].includes(unit) ? 2.54 : null;
const numeric = value => typeof value === 'number' ? value : typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim()) ? Number(value) : NaN;
const range = value => Array.isArray(value) && value.length === 2 && value.every(v => Number.isFinite(v) && v > 0) && value[0] <= value[1];

// AX STYLIST SIZE MATCHING
// sizeGuide contains merchandiser-approved BODY ranges. sizeMeasurements contains
// GARMENT measurements. Never convert one into the other implicitly and never infer
// a customer's size from height/weight alone. Missing data must fail clearly.
export function recommendFit(product, profile = {}, selectedOptions = {}) {
  const guide = product?.sizeGuide;
  const unavailable = reason => ({status:'needs_data',message:reason,recommendedSize:null,selectedSize:null,selectedFit:null});
  if (!guide || guide.version !== 1 || guide.basis !== 'body_circumference' || !unitFactor(guide.unit) || !guide.sizes || Array.isArray(guide.sizes)) return unavailable('AX has not added an approved body-size guide for this piece. Compare its garment chart or ask the AX team.');
  const rows = Object.entries(guide.sizes);
  if (!rows.length || rows.length > 30) return unavailable('The size guide needs checking by AX.');
  const required = dimensions.filter(key => rows.some(([,row]) => row && Object.hasOwn(row,key)));
  if (!required.length || rows.some(([,row]) => !row || required.some(key => !range(row[key])))) return unavailable('The size guide has incomplete or inconsistent measurement ranges. Please ask AX.');
  if (!unitFactor(profile.unit)) return unavailable('Choose the unit for your body measurements.');
  const missing = required.filter(key => !Number.isFinite(numeric(profile[key])) || numeric(profile[key]) <= 0);
  if (missing.length) return {...unavailable(`Add your body ${missing.join(' and ')} measurement${missing.length > 1 ? 's' : ''} to check this piece.`),missing};
  const sizeOption = product.options?.find(option => /^size$/i.test(option.name));
  if (!sizeOption) return unavailable('This piece does not have a supported Size option.');
  if (rows.some(([size]) => !sizeOption.values.includes(size))) return unavailable('The size labels do not match the product options. Please ask AX.');
  const factor = unitFactor(profile.unit) / unitFactor(guide.unit);
  const matches = rows.filter(([,row]) => required.every(key => numeric(profile[key])*factor >= row[key][0] && numeric(profile[key])*factor <= row[key][1]));
  if (!matches.length) return {status:'outside_chart',message:'Your measurements fall outside the approved ranges for this piece, so I can’t confidently choose a size. Ask AX to check the garment chart with you.',recommendedSize:null,selectedSize:null,selectedFit:null};
  if (matches.length > 1) return {status:'between_sizes',message:`Your measurements overlap sizes ${matches.map(([size]) => size).join(' and ')}. Compare the garment chart with a piece you already like, or ask AX to confirm.`,recommendedSize:null,selectedSize:null,selectedFit:null};
  const recommendedSize = matches[0][0];
  const selectedSize = selectedOptions[sizeOption.name] || null;
  const available = (product.variants || []).some(variant => variant.availableForSale && variant.selectedOptions?.some(o => o.name === sizeOption.name && o.value === recommendedSize) && variant.selectedOptions.every(o => o.name === sizeOption.name || !selectedOptions[o.name] || selectedOptions[o.name] === o.value));
  let selectedFit = null;
  // Optional merchant-calibrated chest ease bands: no universal ease assumptions.
  const measurementFactor = unitFactor(product.measurementUnit);
  const garmentChest = numeric(product.sizeMeasurements?.[selectedSize]?.chest);
  if (product.measurementBasis === 'circumference' && measurementFactor && Number.isFinite(garmentChest) && profile.chest && guide.ease_cm) {
    const ease = garmentChest*measurementFactor - numeric(profile.chest)*unitFactor(profile.unit);
    const bands = Object.entries(guide.ease_cm).filter(([label,band]) => ['close','regular','relaxed','oversized'].includes(label) && range(band) && ease >= band[0] && ease < band[1]);
    if (bands.length === 1) selectedFit = bands[0][0];
  }
  return {status:available ? 'recommended' : 'recommended_unavailable',recommendedSize,selectedSize,selectedFit,
    message:`${recommendedSize} matches AX’s approved body-size guide for this cut.${available ? '' : ' It is currently unavailable with the selected options.'}${selectedSize && selectedFit ? ` Your selected ${selectedSize} should feel ${selectedFit}, based on AX’s garment measurements and ease guide.` : ''} Final feel can vary by cut and personal preference.`};
}