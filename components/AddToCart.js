'use client';
import {useCart} from './CartProvider';
import {formatMoney} from '../lib/catalog';
import {isSizeOption,matchesSelection,optionAvailable,visibleOptions} from '../lib/product-variants';
import BackInStockAlert from './BackInStockAlert';
import MeasurementFit from './MeasurementFit';

export default function AddToCart({product,options,selected,variant,onSelect,beforeAddButton=null,afterAddButton=null,restockAlertsEnabled=false}) {
  const {addItem,busy}=useCart(),variants=product.variants||[],shown=visibleOptions(options);
  const missing=shown.find(option=>!selected[option.name]);
  const available=!missing && (product.demo || Boolean(variant?.availableForSale));
  const candidates=variants.filter(item=>matchesSelection(item,selected));
  const pricedVariant=variant || candidates.reduce((best,item)=>{
    const amount=Number(item?.price?.amount);
    if(!Number.isFinite(amount)) return best;
    if(!best || amount<Number(best.price.amount)) return item;
    return best;
  },null);
  const prices=candidates.map(item=>Number(item.price.amount)),price=pricedVariant?Number(pricedVariant.price.amount):prices.length?Math.min(...prices):Number(product.price || 0);
  const currency=pricedVariant?.price?.currencyCode || product.currency;
  const compareAt=Number(pricedVariant?.compareAtPrice?.amount ?? (!variant?product.compareAtPrice:0) ?? 0);
  const onSale=Number.isFinite(compareAt) && compareAt>price;
  const discount=onSale?Math.round(((compareAt-price)/compareAt)*100):0;
  const sizeOption=options.find(option=>isSizeOption(option.name)),selectedSize=sizeOption && selected[sizeOption.name],sizeFit=selectedSize ? product.sizeFits?.[selectedSize] : null;
  const quantity=Number(variant?.quantityAvailable),lowStock=available && Number.isInteger(quantity) && quantity>0 && quantity<=3;
  const soldOutVariant=!product.demo && !missing && Boolean(variant) && variant.availableForSale===false;
  const variantLabel=(variant?.selectedOptions||[]).filter(option=>!(option.name==='Title'&&option.value==='Default Title')).map(option=>option.name+': '+option.value).join(' · ');
  const buttonText=busy?'UPDATING BAG…':missing?'CHOOSE '+missing.name.toUpperCase():product.demo?'ADD TO PREVIEW BAG':available?'ADD TO BAG':soldOutVariant?'SOLD OUT':'UNAVAILABLE';
  const add=()=>addItem({merchandiseId:variant?.id,variant,product});
  return <div className="buy-box">
    <div className="pdp-price-row">
      <div className="pdp-price-group">
        <strong>{!variant && new Set(prices).size>1?'From ':''}{formatMoney(price,currency)}</strong>
        {onSale && <><s className="compare-price">MRP {formatMoney(compareAt,currency)}</s><em className="discount-badge">{discount}% OFF</em></>}
      </div>
      <span className={`availability-label${lowStock?' low-stock':''}`}>{product.demo?'Sample piece':missing?'Choose '+missing.name.toLowerCase():lowStock?`Only ${quantity} left`:available?'Available':soldOutVariant?'Sold out':'Unavailable'}</span>
    </div>
    {shown.map(option=>{
      const size=isSizeOption(option.name);
      return <fieldset className={`option-block${size?' size-option-block':''}`} key={option.name}>
        <legend className={size?'option-legend-with-action':''}>
          <span>{size?'Select Size':`${option.name}: ${selected[option.name]||'Choose an option'}`}</span>
          {size&&<MeasurementFit product={product} selectedOptions={selected} inline/>}
        </legend>
        <div className="option-values">{option.values.map(value=>{const possible=optionAvailable(variants,selected,option.name,value);return <button type="button" key={value} disabled={busy} aria-pressed={selected[option.name]===value} className={`${selected[option.name]===value?'selected':''} ${possible?'':'unavailable'}`} onClick={()=>onSelect(option.name,value)}>{value}<span className="sr-only">{possible?'':' — unavailable with this selection'}</span></button>;})}</div>
      </fieldset>;
    })}
    {sizeOption && sizeFit?.text && <div className="size-recommendation" aria-live="polite"><p><strong>{selectedSize}</strong> · {sizeFit.text}</p><span>AX garment fit note.</span></div>}
    {beforeAddButton}
    <button type="button" className="add-bag" disabled={!available||busy} onClick={add}>{buttonText}</button>
    {afterAddButton}
    {soldOutVariant&&restockAlertsEnabled&&<BackInStockAlert productHandle={product.handle} variantId={variant.id} variantLabel={variantLabel}/>}
    {product.demo && <p className="cart-note">Sample catalog. Sizes and availability will appear when the store opens.</p>}
  </div>;
}
