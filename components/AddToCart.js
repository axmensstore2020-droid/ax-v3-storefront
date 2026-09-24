'use client';
import {useState} from 'react';
import {useCart} from './CartProvider';
import {formatMoney} from '../lib/catalog';
import {isSizeOption,matchesSelection,optionAvailable,visibleOptions} from '../lib/product-variants';
import BackInStockAlert from './BackInStockAlert';
import MeasurementFit from './MeasurementFit';
import LinkedColourways from './LinkedColourways';

// PURCHASE GATE
// This component does not invent a variant. It receives ProductPurchase's selected
// options and enables Add to Bag only when they resolve to a real available Shopify
// variant. For option-matching bugs, inspect lib/product-variants.js before changing UI logic.
export default function AddToCart({product,options,selected,variant,onSelect,colourways=[],beforeAddButton=null,afterAddButton=null,restockAlertsEnabled=false}) {
  const {addItem,busy,openCart,cart,demoLines,demo,notice}=useCart(),variants=product.variants||[],shown=visibleOptions(options).filter(option=>!(colourways.length>1 && /colou?r/i.test(option.name||'') && option.values?.length===1));
  const [buying,setBuying]=useState(false);
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
  const variantKey=variant?.id || (product.demo?product.handle:'');
  const inBag=available && Boolean(variantKey) && (demo
    ? demoLines.some(line=>line.key===variantKey)
    : (cart?.lines?.nodes||[]).some(line=>line.merchandise?.id===variant?.id));
  const buttonText=busy&&!buying?'UPDATING BAG…':inBag?'VIEW BAG':missing?'CHOOSE '+missing.name.toUpperCase():product.demo?'ADD TO PREVIEW BAG':available?'ADD TO BAG':soldOutVariant?'SOLD OUT':'UNAVAILABLE';
  async function add(){
    if(inBag){openCart();return;}
    await addItem({merchandiseId:variant?.id,variant,product});
  }
  async function quickBuy(){
    if(!available || product.demo || busy)return;
    setBuying(true);
    const added=inBag || await addItem({merchandiseId:variant?.id,variant,product});
    if(added)openCart('checkout');
    setBuying(false);
  }
  return <div className="buy-box">
    <div className="pdp-price-row">
      <div className="pdp-price-group">
        <strong>{!variant && new Set(prices).size>1?'From ':''}{formatMoney(price,currency)}</strong>
        {onSale && <><s className="compare-price">MRP {formatMoney(compareAt,currency)}</s><em className="discount-badge">{discount}% OFF</em></>}
      </div>
      <span className={`availability-label${lowStock?' low-stock':''}`}>{product.demo?'Sample piece':missing?'Choose '+missing.name.toLowerCase():lowStock?`Only ${quantity} left`:available?'Available':soldOutVariant?'Sold out':'Unavailable'}</span>
    </div>
    <LinkedColourways product={product} items={colourways}/>
    {shown.map(option=>{
      const size=isSizeOption(option.name);
      return <fieldset className={`option-block${size?' size-option-block':''}`} key={option.name}>
        <legend className={size?'option-legend-with-action':''}>
          <span>{size?'Select Size':`${option.name}: ${selected[option.name]||'Choose an option'}`}</span>
          {size&&<MeasurementFit product={product} selectedOptions={selected} inline/>}
        </legend>
        <div className="option-values">{option.values.map(value=>{const possible=optionAvailable(variants,selected,option.name,value);return <button type="button" key={value} disabled={busy||!possible} aria-disabled={!possible} aria-pressed={selected[option.name]===value} className={`${selected[option.name]===value?'selected':''} ${possible?'':'unavailable'}`} onClick={()=>onSelect(option.name,value)}>{value}<span className="sr-only">{possible?'':' — unavailable with this selection'}</span></button>;})}</div>
      </fieldset>;
    })}
    {sizeOption && sizeFit?.text && <div className="size-recommendation" aria-live="polite"><p><strong>{selectedSize}</strong> · {sizeFit.text}</p><span>AX garment fit note.</span></div>}
    {beforeAddButton}
    <div className="purchase-actions">
      <button type="button" className="add-bag" disabled={(!available&&!inBag)||busy} onClick={add}>{buttonText}</button>
      <button type="button" className="buy-now" disabled={!available||busy||product.demo} onClick={quickBuy}>{buying?'OPENING CHECKOUT…':product.demo?'BUY NOW UNAVAILABLE':'BUY NOW'}</button>
    </div>
    {notice&&<p className="cart-note cart-inline-notice" role="alert">{notice}</p>}
    {afterAddButton}
    {soldOutVariant&&restockAlertsEnabled&&<BackInStockAlert productHandle={product.handle} variantId={variant.id} variantLabel={variantLabel}/>}
    {product.demo && <p className="cart-note">Sample catalog. Sizes and availability will appear when the store opens.</p>}
  </div>;
}
