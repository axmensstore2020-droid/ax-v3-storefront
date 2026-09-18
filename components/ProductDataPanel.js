import MeasurementFit from './MeasurementFit';

export default function ProductDataPanel({product,selectedOptions={}}) {
  const measurements = product.sizeMeasurements || {};
  const sizes = [...new Set([...(product.options?.find(option => /size/i.test(option.name))?.values || []),...Object.keys(measurements),...Object.keys(product.sizeFits || {})])];
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
        {product.fabricFeel && <div><dt>Fabric feel</dt><dd>{product.fabricFeel}</dd></div>}
        {product.modelHeight && <div><dt>Model height</dt><dd>{product.modelHeight}</dd></div>}
        {product.modelSize && <div><dt>Model wears</dt><dd>{product.modelSize}</dd></div>}
      </dl>
      {(hasNotes || hasMeasurements || product.fit) && <MeasurementFit product={product} selectedOptions={selectedOptions}/>} 
      {product.care && <details className="care-details"><summary>Care</summary><p>{product.care}</p></details>}
    </>}
  </section>;
}
