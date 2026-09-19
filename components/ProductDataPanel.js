import MeasurementFit from './MeasurementFit';

function readableDescription(value=''){
  return String(value||'')
    .replace(/\s*(Fit:|Fabric:|Weight:|Available in\b)/gi,'\n$1')
    .replace(/([.!?])(?=[A-Z])/g,'$1 ')
    .trim();
}

export default function ProductDataPanel({product,selectedOptions={}}) {
  const measurements = product.sizeMeasurements || {};
  const sizes = [...new Set([...(product.options?.find(option => /size/i.test(option.name))?.values || []),...Object.keys(measurements),...Object.keys(product.sizeFits || {})])];
  const hasNotes = sizes.some(size => product.sizeFits?.[size]?.text);
  const hasMeasurements = sizes.some(size => measurements[size] && typeof measurements[size] === 'object');
  const hasSizeContent = hasNotes || hasMeasurements || Boolean(product.fit);
  const hasFacts = product.fit || product.fabric || product.color || product.style || product.care || product.fabricFeel || product.modelHeight || product.modelSize;
  const description=readableDescription(product.description);
  if (!product.productNumberDisplay && !hasFacts && !hasSizeContent && !description) return null;

  return <section className="product-data-panel" aria-label="Product information">
    <details className="product-info-details">
      <summary>Product information</summary>
      <div className="product-info-content">
        {description&&<p className="product-description">{description}</p>}
        <div className="exchange-note"><strong>7-day exchange available</strong><span>For eligible unworn, unwashed and undamaged items.</span></div>
        {product.productNumberDisplay && <p className="product-number">PRODUCT NO. <span>{product.productNumberDisplay}</span></p>}
        {hasFacts && <>
          <dl className="product-facts">
            {product.fit && <div><dt>Fit</dt><dd>{product.fit}</dd></div>}
            {product.fabric && <div><dt>Fabric</dt><dd>{product.fabric}</dd></div>}
            {product.color && <div><dt>Colour</dt><dd>{product.color}</dd></div>}
            {product.style && <div><dt>Style</dt><dd>{product.style}</dd></div>}
            {product.fabricFeel && <div><dt>Fabric feel</dt><dd>{product.fabricFeel}</dd></div>}
            {product.modelHeight && <div><dt>Model height</dt><dd>{product.modelHeight}</dd></div>}
            {product.modelSize && <div><dt>Model wears</dt><dd>{product.modelSize}</dd></div>}
          </dl>
          {product.care && <details className="care-details"><summary>Care</summary><p>{product.care}</p></details>}
        </>}
      </div>
    </details>
    {hasSizeContent&&<MeasurementFit product={product} selectedOptions={selectedOptions}/>}
  </section>;
}
