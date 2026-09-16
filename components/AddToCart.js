'use client';
import {useCart} from './CartProvider';
import {StylistButton} from './StylistProvider';
import {formatMoney} from '../lib/catalog';
import {isSizeOption,matchesSelection,optionAvailable,visibleOptions} from '../lib/product-variants';
import Icon from './Icon';

export default function AddToCart({product,options,selected,variant,onSelect}) {
  const {addItem,busy}=useCart(),variants=product.variants||[],shown=visibleOptions(options);
  const missing=shown.find(option=>!selected[option.name]);
  const available=!missing && (product.demo || Boolean(variant?.availableForSale));
  const candidates=variants.filter(item=>matchesSelection(item,selected));
  const prices=candidates.map(item=>Number(item.price.amount)),price=variant?Number(variant.price.amount):prices.length?Math.min(...prices):product.price;
  const sizeOption=options.find(option=>isSizeOption(option.name)),selectedSize=sizeOption && selected[sizeOption.name],sizeFit=selectedSize ? product.sizeFits?.[selectedSize] : null;
  return <div className="buy-box">
    <div className="pdp-price-row"><strong>{!variant && new Set(prices).size>1?'From ':''}{formatMoney(price,variant?.price?.currencyCode||product.currency)}</strong><span>{product.demo?'Sample piece':missing?'Choose '+missing.name.toLowerCase():available?'Available':'Unavailable'}</span></div>
    {shown.map(option=><fieldset className="option-block" key={option.name}>
      <legend>{option.name}: {selected[option.name]||'Choose an option'}</legend>
      <div className="option-values">{option.values.map(value=>{const possible=optionAvailable(variants,selected,option.name,value);return <button type="button" key={value} disabled={busy} aria-pressed={selected[option.name]===value} className={`${selected[option.name]===value?'selected':''} ${possible?'':'unavailable'}`} onClick={()=>onSelect(option.name,value)}>{value}<span className="sr-only">{possible?'':' — unavailable with this selection'}</span></button>;})}</div>
    </fieldset>)}
    {sizeOption && sizeFit?.text && <div className="size-recommendation" aria-live="polite"><p><strong>{selectedSize}</strong> · {sizeFit.text}</p><span>AX’s garment note—not a personal size recommendation.</span></div>}
    <StylistButton className="find-size" mode="size" product={{title:product.title,handle:product.handle,selectedOptions:selected}}>FIND MY SIZE WITH AX <Icon name="arrow" size={17}/></StylistButton>
    <button type="button" className="add-bag" disabled={!available||busy} onClick={()=>addItem({merchandiseId:variant?.id,variant,product})}>{busy?'UPDATING BAG…':missing?'CHOOSE '+missing.name.toUpperCase():product.demo?'ADD TO PREVIEW BAG':available?'ADD TO BAG':'UNAVAILABLE'}</button>
    {product.demo && <p className="cart-note">Sample catalog. Sizes and availability will appear when the store opens.</p>}
  </div>;
}
