export const MEASUREMENT_SCHEMAS = Object.freeze({
  tee: ['chest','shoulder','length','sleeve'],
  long_sleeve: ['chest','shoulder','length','sleeve'],
  shirt: ['chest','shoulder','length','sleeve'],
  hoodie: ['chest','shoulder','length','sleeve'],
  jacket: ['chest','shoulder','length','sleeve'],
  jeans: ['waist','hip','front_rise','thigh','inseam','outseam','leg_opening'],
  bottom: ['waist','hip','front_rise','thigh','inseam','outseam','leg_opening'],
  shorts: ['waist','hip','front_rise','thigh','inseam','outseam','leg_opening']
});

export const CIRCUMFERENCE_FIELDS = Object.freeze(['chest','waist','hip','thigh','knee','leg_opening']);
const CIRCUMFERENCE_SET = new Set(CIRCUMFERENCE_FIELDS);

const FIELD_ALIASES = new Map([
  ['chest','chest'],['chest_circumference','chest'],['chest_width','chest'],['pit_to_pit','chest'],['pit2pit','chest'],
  ['shoulder','shoulder'],['shoulders','shoulder'],['shoulder_width','shoulder'],
  ['length','length'],['body_length','length'],['back_length','length'],
  ['front_length','length'],['front_body_length','length'],
  ['sleeve','sleeve'],['sleeve_length','sleeve'],
  ['waist','waist'],['waist_circumference','waist'],['waist_width','waist'],
  ['hip','hip'],['hips','hip'],['hip_circumference','hip'],['hip_width','hip'],
  ['front_rise','front_rise'],['rise','front_rise'],
  ['thigh','thigh'],['thigh_circumference','thigh'],['thigh_width','thigh'],
  ['inseam','inseam'],['inside_leg','inseam'],['inside_length','inseam'],
  ['outseam','outseam'],['outside_leg','outseam'],['outside_length','outseam'],
  ['leg_opening','leg_opening'],['hem_opening','leg_opening'],['bottom_opening','leg_opening'],['hem','leg_opening']
]);

const LABELS = Object.freeze({
  chest:'Chest', shoulder:'Shoulder', length:'Length', front_length:'Front length', sleeve:'Sleeve',
  waist:'Waist', hip:'Hip', front_rise:'Front rise', thigh:'Thigh', inseam:'Inseam', outseam:'Outseam', leg_opening:'Leg opening'
});

const markerLetters = 'ABCDEFG'.split('');

const clean = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');

export function canonicalMeasurementField(value) {
  const key = clean(value).replace(/_cm$/, '');
  if(key==='thighs') return 'thigh';
  return FIELD_ALIASES.get(key) || key;
}

export function measurementLabel(field) {
  return LABELS[canonicalMeasurementField(field)] || String(field || '').replace(/[_-]+/g,' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

export function canonicalMeasurementUnit(value) {
  const unit = String(value || '').trim().toLowerCase().replace(/\./g,'');
  if (['cm','centimetre','centimetres','centimeter','centimeters'].includes(unit)) return 'cm';
  if (['in','inch','inches','"'].includes(unit)) return 'inches';
  return '';
}

export function canonicalMeasurementBasis(value) {
  const basis = clean(value);
  if (!basis) return '';
  if (basis.includes('flat') || basis.includes('width')) return 'flat';
  if (basis.includes('circumference') || basis.includes('full_round') || basis.includes('around')) return 'circumference';
  return '';
}

export function measurementCategory(product = {}) {
  const haystack = [product.type, product.title, product.style, ...(Array.isArray(product.tags) ? product.tags : [])].filter(Boolean).join(' ').toLowerCase();
  if (/\bshorts?\b/.test(haystack)) return 'shorts';
  if (/\b(jeans?|denim)\b/.test(haystack)) return 'jeans';
  if (/\b(jeans?|pants?|trousers?|bottoms?|cargos?|joggers?|sweatpants?|chinos?)\b/.test(haystack)) return 'bottom';
  if (/\bhoodies?\b|\bsweatshirts?\b/.test(haystack)) return 'hoodie';
  if (/\b(jackets?|coats?|blazers?)\b/.test(haystack)) return 'jacket';
  if (/\bshirts?\b/.test(haystack) && !/\bt[ -]?shirts?\b/.test(haystack)) return 'shirt';
  if (/\b(long[- ]?sleeves?|full[- ]?sleeves?|long[- ]?sleeve tees?)\b/.test(haystack)) return 'long_sleeve';
  if (/\b(t[ -]?shirts?|tees?)\b/.test(haystack)) return 'tee';
  if (/\bshirts?\b/.test(haystack)) return 'shirt';
  return '';
}

export function measurementFieldsForProduct(product = {}) {
  return MEASUREMENT_SCHEMAS[measurementCategory(product)] || [];
}

export function measurementMarkers(product = {}) {
  return measurementFieldsForProduct(product).map((field,index) => ({marker:markerLetters[index],field,label:measurementLabel(field)}));
}

function numericStructure(value, transform) {
  if (typeof value === 'number' && Number.isFinite(value)) return transform(value);
  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(?:cm|in|inch|inches|\")?$/i);
    return match ? transform(Number(match[1])) : value;
  }
  if (Array.isArray(value)) return value.map(item => numericStructure(item,transform));
  if (value && typeof value === 'object') {
    const result = {...value};
    for (const key of ['min','max','from','to','value']) if (Object.hasOwn(result,key)) result[key] = numericStructure(result[key],transform);
    return result;
  }
  return value;
}

const round2 = value => Math.round((value + Number.EPSILON) * 100) / 100;

export function normalizeMeasurementRows(measurements = {}, {unit='',basis='',category=''} = {}) {
  if (!measurements || typeof measurements !== 'object' || Array.isArray(measurements)) return {rows:{},unit:canonicalMeasurementUnit(unit) || unit || '',basis:canonicalMeasurementBasis(basis) || basis || '',standardized:false};
  const sourceUnit = canonicalMeasurementUnit(unit);
  const sourceBasis = canonicalMeasurementBasis(basis);
  const canStandardize = Boolean(sourceUnit && sourceBasis);
  const unitFactor = sourceUnit === 'inches' ? 2.54 : 1;
  const rows = {};
  for (const [size,row] of Object.entries(measurements)) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) { rows[size] = row; continue; }
    const normalized = {};
    for (const [rawField,value] of Object.entries(row)) {
      let field = canonicalMeasurementField(rawField);
      if (['bottom','jeans','shorts'].includes(category) && field==='length') field='outseam';
      const multiplier = canStandardize && sourceBasis === 'flat' && CIRCUMFERENCE_SET.has(field) ? 2 : 1;
      normalized[field] = canStandardize ? numericStructure(value, number => round2(number * unitFactor * multiplier)) : value;
    }
    rows[size] = normalized;
  }
  return {
    rows,
    unit: canStandardize ? 'cm' : (sourceUnit || unit || ''),
    basis: canStandardize ? 'circumference' : (sourceBasis || basis || ''),
    standardized: canStandardize
  };
}

export function convertMeasurementValue(value, targetUnit = 'cm') {
  const target = canonicalMeasurementUnit(targetUnit) || 'cm';
  const factor = target === 'inches' ? 1 / 2.54 : 1;
  return numericStructure(value, number => target === 'inches' ? Math.round(number * factor * 10) / 10 : round2(number));
}

export function formatMeasurementDisplay(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(formatMeasurementDisplay).join('–');
  if (typeof value === 'object') {
    const min = value.min ?? value.from;
    const max = value.max ?? value.to;
    if (min !== undefined && max !== undefined) return `${formatMeasurementDisplay(min)}–${formatMeasurementDisplay(max)}`;
    if (value.value !== undefined) return formatMeasurementDisplay(value.value);
  }
  return '—';
}
