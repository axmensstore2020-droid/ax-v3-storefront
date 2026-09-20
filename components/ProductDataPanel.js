function readableDescription(value=''){
  const text=String(value||'')
    .replace(/\s+/g,' ')
    .replace(/([.!?])(?=[A-Z])/g,'$1 ')
    .trim();
  if(!text)return '';
  const metadataStart=text.search(/\b(?:Fit|Fabric|Colour|Color|Weight|Available in)\s*:/i);
  return (metadataStart>=0?text.slice(0,metadataStart):text).trim();
}

export default function ProductDataPanel({product}) {
  const description=readableDescription(product.description);
  const hasFacts=product.fabric || product.color || product.style || product.fabricFeel;
  if (!product.productNumberDisplay && !hasFacts && !product.care && !description) return null;

  return <section className="product-data-panel" aria-label="Product information">
    <details className="product-info-details">
      <summary>Product information</summary>
      <div className="product-info-content">
        {description&&<section className="product-info-section product-details-copy">
          <h3>Product details</h3>
          <p className="product-description">{description}</p>
        </section>}
        {hasFacts&&<dl className="product-facts">
          {product.fabric && <div><dt>Fabric</dt><dd>{product.fabric}</dd></div>}
          {product.color && <div><dt>Colour</dt><dd>{product.color}</dd></div>}
          {product.style && <div><dt>Style</dt><dd>{product.style}</dd></div>}
          {product.fabricFeel && <div><dt>Fabric feel</dt><dd>{product.fabricFeel}</dd></div>}
        </dl>}
        {product.care&&<section className="product-info-section product-care">
          <h3>Material &amp; Care</h3>
          <p>{product.care}</p>
        </section>}
        {product.productNumberDisplay && <p className="product-number">PRODUCT NO. <span>{product.productNumberDisplay}</span></p>}
      </div>
    </details>
  </section>;
}
