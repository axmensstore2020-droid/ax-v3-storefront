import {formatMeasurementValue} from '../lib/product-data';

const titleCase = value => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

function sizeOrder(product, values) {
  const optionValues = product.options?.find(option => /size/i.test(option.name))?.values || [];
  const known = new Set([...optionValues, ...Object.keys(values || {})]);
  return [...known];
}

function measurementColumns(measurements) {
  const columns = [];
  Object.values(measurements || {}).forEach(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return;
    Object.keys(row).forEach(key => { if (!columns.includes(key)) columns.push(key); });
  });
  return columns;
}

export default function ProductDataPanel({product}) {
  const measurements = product.sizeMeasurements || {};
  const sizes = sizeOrder(product, {...measurements, ...(product.sizeFits || {})});
  const columns = measurementColumns(measurements);
  const hasNotes = sizes.some(size => product.sizeFits?.[size]?.text);
  const hasMeasurements = sizes.some(size => measurements[size] && typeof measurements[size] === 'object');
  const hasFitContent = product.fit || product.fabric || product.color || product.style || product.care || hasNotes || hasMeasurements;
  if (!product.productNumberDisplay && !hasFitContent) return null;
  return <section className="product-data-panel" aria-label="Product information">
    {product.productNumberDisplay && <p className="product-number">PRODUCT NO. <span>{product.productNumberDisplay}</span></p>}
    {hasFitContent && <>
      <dl className="product-facts">
        {product.fit && <div><dt>Fit</dt><dd>{product.fit}</dd></div>}
        {product.fabric && <div><dt>Fabric</dt><dd>{product.fabric}</dd></div>}
        {product.color && <div><dt>Colour</dt><dd>{product.color}</dd></div>}
        {product.style && <div><dt>Style</dt><dd>{product.style}</dd></div>}
      </dl>
      {(hasNotes || hasMeasurements) && <details className="fit-details" open>
        <summary>Size &amp; fit</summary>
        {product.fit && <p className="fit-summary">This piece is {product.fit.toLowerCase()}.</p>}
        {hasNotes && <div className="size-fit-notes" aria-label="Size fit notes">
          {sizes.filter(size => product.sizeFits?.[size]?.text).map(size => <p key={size}><strong>{size}</strong><span>{product.sizeFits[size].text}</span></p>)}
        </div>}
        {hasMeasurements && <div className="measurement-table-wrap"><table className="measurement-table"><caption>Garment measurements{product.measurementUnit ? ` (${product.measurementUnit})` : ' — unit not supplied; confirm with AX'}{product.measurementBasis ? ` · ${product.measurementBasis.replaceAll('_',' ')}` : ''}</caption><thead><tr><th>Size</th>{columns.map(column => <th key={column}>{titleCase(column)}</th>)}</tr></thead><tbody>{sizes.filter(size => measurements[size]).map(size => <tr key={size}><th scope="row">{size}</th>{columns.map(column => <td key={column}>{formatMeasurementValue(measurements[size]?.[column]) || '—'}</td>)}</tr>)}</tbody></table></div>}
        <p className="measurement-note">Compare these garment measurements with a favourite piece before choosing your size.</p>
      </details>}
      {product.care && <details className="care-details"><summary>Care</summary><p>{product.care}</p></details>}
    </>}
  </section>;
}
