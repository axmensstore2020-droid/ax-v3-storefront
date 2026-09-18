// Structured AX product information.
//
// Shopify's native product fields remain the source of truth for commerce
// (title, description, options, variants, price and inventory). The optional
// `ax_data` metafields below hold the merchandising information that helps a
// shopper choose a piece: fit, fabric, colour, measurements and size notes.
// The legacy `ax.data` and `ax` namespaces remain readable for older catalog
// entries.
// Tags and description labels are accepted as a safe fallback while the
// metafields are being added to the catalogue.
export const AX_PRODUCT_METAFIELDS = [
  'product_number',
  'fit',
  'fabric',
  'color',
  'colour',
  'style',
  'care',
  'measurement_unit',
  'measurement_basis',
  'size_guide',
  'measurements',
  'size_recommendations',
  'model_height',
  'model_size',
  'fabric_feel'
];

const METAFIELD_ALIASES = {
  productNumber: ['product_number', 'product-number', 'productnumber', 'sku'],
  fit: ['fit'],
  fabric: ['fabric', 'material'],
  color: ['color', 'colour'],
  style: ['style'],
  care: ['care', 'care_instructions'],
  measurementUnit: ['measurement_unit', 'measurement-unit', 'unit'],
  measurementBasis: ['measurement_basis'],
  sizeGuide: ['size_guide'],
  measurements: ['measurements', 'measurement'],
  sizeRecommendations: ['size_recommendations', 'size-recommendation', 'fit_notes'],
  modelHeight: ['model_height', 'model-height'],
  modelSize: ['model_size', 'model-size', 'size_worn'],
  fabricFeel: ['fabric_feel', 'fabric-feel', 'handfeel']
};

const canonicalKey = value => String(value || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');

function parseJson(value) {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return value; }
}

function asText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  return '';
}

function canonicalUnit(value) {
  const text = asText(value).toLowerCase().replace(/\./g, '');
  if (['cm','centimetre','centimetres','centimeter','centimeters'].includes(text)) return 'cm';
  if (['in','inch','inches','"'].includes(text)) return 'inches';
  return '';
}

function normalizeBodySizeGuide(value,measurementUnit,measurementBasis) {
  const parsed = parseJson(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed;
  if (parsed.version === 1) return parsed;
  if (!/\bbody\b/i.test(asText(measurementBasis))) return parsed;
  let unit = canonicalUnit(measurementUnit);
  const sizes = {};
  for (const [size,row] of Object.entries(parsed)) {
    if (typeof row !== 'string' || !/\bchest\b/i.test(row)) return parsed;
    const match = row.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*(cm|centimetres?|centimeters?|in|inches?|inch|\")?/i);
    if (!match) return parsed;
    const min = Number(match[1]), max = Number(match[2]), rowUnit = canonicalUnit(match[3]) || unit;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || min > max || !rowUnit) return parsed;
    if (unit && rowUnit !== unit) return parsed;
    unit = rowUnit;
    sizes[size] = {chest:[min,max]};
  }
  if (!unit || !Object.keys(sizes).length) return parsed;
  return {version:1,basis:'body_circumference',unit,sizes};
}

function metafieldMap(product) {
  return (product?.metafields || []).reduce((map, field) => {
    if (!field?.key || field.value === null || field.value === undefined) return map;
    if (field.namespace && !['ax_data', 'ax.data', 'ax'].includes(field.namespace)) return map;
    map[canonicalKey(field.key)] = parseJson(field.value);
    return map;
  }, {});
}

function tagMap(tags = []) {
  return tags.reduce((map, raw) => {
    const tag = String(raw || '').trim();
    const match = tag.match(/^(?:ax\s*[:._-]\s*)?([^:=]+?)\s*[:=]\s*(.+)$/i);
    if (!match) return map;
    map[canonicalKey(match[1])] = match[2].trim();
    return map;
  }, {});
}

function descriptionMap(description = '') {
  const map = {};
  const text = String(description || '').replace(/<[^>]+>/g, '\n');
  text.split(/\r?\n|[|;]/).forEach(line => {
    const match = line.trim().match(/^(product\s*(?:no|number)|fit|fabric|material|colou?r|style|care|measurements?|size\s*(?:recommendations?|notes?))\s*[:=-]\s*(.+)$/i);
    if (match) map[canonicalKey(match[1].replace(/product\s*(?:no|number)/i, 'product_number'))] = match[2].trim();
  });
  return map;
}

function pickField(metafields, tags, description, key) {
  for (const alias of METAFIELD_ALIASES[key] || [key]) {
    const normalized = canonicalKey(alias);
    if (metafields[normalized] !== undefined && metafields[normalized] !== null && metafields[normalized] !== '') return metafields[normalized];
    if (tags[normalized] !== undefined && tags[normalized] !== '') return tags[normalized];
    if (description[normalized] !== undefined && description[normalized] !== '') return description[normalized];
  }
  return null;
}

function parseSizeMap(value) {
  const parsed = parseJson(value);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  const text = asText(parsed);
  if (!text) return {};
  return text.split(/\r?\n|\s*;\s*/).reduce((map, line) => {
    const match = line.trim().match(/^([^:=]+)\s*[:=]\s*(.+)$/);
    if (match) map[match[1].trim()] = match[2].trim();
    return map;
  }, {});
}

function parseMeasurements(value) {
  const parsed = parseJson(value);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  const text = asText(parsed);
  if (!text) return {};
  return text.split(/\r?\n|\s*;\s*/).reduce((map, line) => {
    const match = line.trim().match(/^([^:=]+)\s*[:=]\s*(.+)$/);
    if (!match) return map;
    const size = match[1].trim();
    const dimensions = match[2].split(/\s*,\s*/).reduce((result, item) => {
      const pair = item.match(/^([^:=]+)\s*[:=]\s*(.+)$/);
      if (pair) result[pair[1].trim().toLowerCase()] = pair[2].trim();
      return result;
    }, {});
    map[size] = Object.keys(dimensions).length ? dimensions : match[2].trim();
    return map;
  }, {});
}

function normalizeRecommendation(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const label = asText(value.label || value.fit || value.title);
    const description = asText(value.description || value.note || value.reason);
    return {label, description, text: [label, description].filter(Boolean).join(' — ')};
  }
  const text = asText(value);
  return text ? {label: text, description: '', text} : null;
}

export function formatMeasurementValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.join('–');
  if (typeof value === 'object') {
    const min = value.min ?? value.from;
    const max = value.max ?? value.to;
    if (min !== undefined && max !== undefined) return `${min}–${max}`;
    if (value.value !== undefined) return String(value.value);
  }
  return '';
}

export function publicProductNumber(product) {
  const explicit = asText(product?.productNumber);
  if (explicit) return explicit.toUpperCase();
  const sku = asText(product?.sku || product?.variantSku || product?.variants?.find?.(variant => variant?.sku)?.sku);
  if (sku) return sku.toUpperCase();
  const digits = String(product?.id || '').replace(/\D/g, '');
  return digits ? `AX-${digits.slice(-6).padStart(6, '0')}` : '';
}

export function recommendedSizeFromMeasurements(measurements, input, dimension = 'chest') {
  const numericInput = Number(input);
  if (!Number.isFinite(numericInput) || numericInput <= 0 || !measurements || typeof measurements !== 'object') return '';
  const rows = Object.entries(measurements).map(([size, values]) => {
    const value = values && typeof values === 'object' ? values[dimension] : null;
    return {size, value: Number.parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''))};
  }).filter(row => Number.isFinite(row.value)).sort((a, b) => a.value - b.value);
  return rows.find(row => row.value >= numericInput)?.size || '';
}

export function normalizeProductData(product = {}) {
  const metafields = metafieldMap(product);
  const tags = tagMap(product.tags);
  const description = descriptionMap(product.description);
  const optionColor = product.options?.find?.(option => /colou?r/i.test(option.name || ''))?.values?.join(', ');
  const productNumber = pickField(metafields, tags, description, 'productNumber') ?? product.productNumber;
  const fit = pickField(metafields, tags, description, 'fit') ?? product.fit;
  const fabric = pickField(metafields, tags, description, 'fabric') ?? product.fabric;
  const color = pickField(metafields, tags, description, 'color') ?? product.color ?? optionColor;
  const style = pickField(metafields, tags, description, 'style') ?? product.style;
  const care = pickField(metafields, tags, description, 'care') ?? product.care;
  const measurementUnit = pickField(metafields, tags, description, 'measurementUnit') ?? product.measurementUnit;
  const measurementBasis = pickField(metafields, tags, description, 'measurementBasis') ?? product.measurementBasis;
  const rawSizeGuide = pickField(metafields, tags, description, 'sizeGuide') ?? product.sizeGuide;
  const modelHeight = pickField(metafields, tags, description, 'modelHeight') ?? product.modelHeight;
  const modelSize = pickField(metafields, tags, description, 'modelSize') ?? product.modelSize;
  const fabricFeel = pickField(metafields, tags, description, 'fabricFeel') ?? product.fabricFeel;
  const sizeGuide = normalizeBodySizeGuide(rawSizeGuide,measurementUnit,measurementBasis);
  const rawRecommendations = pickField(metafields, tags, description, 'sizeRecommendations');
  const rawMeasurements = pickField(metafields, tags, description, 'measurements');
  const sizeRecommendations = rawRecommendations === null ? (product.sizeRecommendations || {}) : parseSizeMap(rawRecommendations);
  const measurements = rawMeasurements === null ? (product.sizeMeasurements || {}) : parseMeasurements(rawMeasurements);
  const sizeFits = Object.entries(sizeRecommendations).reduce((map, [size, value]) => {
    const recommendation = normalizeRecommendation(value);
    if (recommendation) map[size] = recommendation;
    return map;
  }, {});
  const recommendedSize = Object.entries(sizeFits).find(([, value]) => /recommend|best|ideal/i.test(value.text))?.[0] || '';
  return {
    ...product,
    productNumber: asText(productNumber) || '',
    fit: asText(fit) || '',
    fabric: asText(fabric) || '',
    color: asText(color) || '',
    style: asText(style) || '',
    care: asText(care) || '',
    measurementUnit: asText(measurementUnit) || '',
    measurementBasis: asText(measurementBasis) || '',
    modelHeight: asText(modelHeight) || '',
    modelSize: asText(modelSize) || '',
    fabricFeel: asText(fabricFeel) || '',
    sizeGuide: sizeGuide && typeof sizeGuide === 'object' && !Array.isArray(sizeGuide) ? sizeGuide : null,
    sizeMeasurements: measurements,
    sizeRecommendations,
    sizeFits,
    recommendedSize,
    productNumberDisplay: publicProductNumber({...product, productNumber: asText(productNumber)})
  };
}
