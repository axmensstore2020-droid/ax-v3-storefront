'use client';
import {useEffect,useRef,useState} from 'react';
import {useCart} from './CartProvider';
import {StylistButton} from './StylistProvider';
import {formatMoney} from '../lib/catalog';
import {isSizeOption,matchesSelection,optionAvailable,visibleOptions} from '../lib/product-variants';
import Icon from './Icon';

export default function AddToCart({product,options,selected,variant,onSelect}) {
  const {addItem,busy}=useCart(),variants=product.variants||[],shown=visibleOptions(options);
  const [showSticky,setShowSticky]=useState(false),primaryButton=useRef(null);
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
  const buttonText=busy?'UPDATING BAG…':missing?'CHOOSE '+missing.name.toUpperCase():product.demo?'ADD TO PREVIEW BAG':available?'ADD TO BAG':'UNAVAILABLE';
  const add=()=>addItem({merchandiseId:variant?.id,variant,product});
  useEffect(()=>{
    const node=primaryButton.current;
    if(!node || typeof IntersectionObserver==='undefined') return;
    const observer=new IntersectionObserver(([entry])=>setShowSticky(!entry.isIntersecting),{threshold:.2});
    observer.observe(node);return()=>observer.disconnect();
  },[]);
  return <div className="buy-box">
    <div className="pdp-price-row">
      <div className="pdp-price-group">
        <strong>{!variant && new Set(prices).size>1?'From ':''}{formatMoney(price,currency)}</strong>
        {onSale && <><s className="compare-price">MRP {formatMoney(compareAt,currency)}</s><em className="discount-badge">{discount}% OFF</em></>}
      </div>
      <span className={`availability-label${lowStock?' low-stock':''}`}>{product.demo?'Sample piece':missing?'Choose '+missing.name.toLowerCase():lowStock?`Only ${quantity} left`:available?'Available':'Unavailable'}</span>
    </div>
    {shown.map(option=><fieldset className="option-block" key={option.name}>
      <legend>{option.name}: {selected[option.name]||'Choose an option'}</legend>
      <div className="option-values">{option.values.map(value=>{const possible=optionAvailable(variants,selected,option.name,value);return <button type="button" key={value} disabled={busy} aria-pressed={selected[option.name]===value} className={`${selected[option.name]===value?'selected':''} ${possible?'':'unavailable'}`} onClick={()=>onSelect(option.name,value)}>{value}<span className="sr-only">{possible?'':' — unavailable with this selection'}</span></button>;})}</div>
    </fieldset>)}
    {sizeOption && sizeFit?.text && <div className="size-recommendation" aria-live="polite"><p><strong>{selectedSize}</strong> · {sizeFit.text}</p><span>AX’s garment note—not a personal size recommendation.</span></div>}
    <StylistButton className="find-size" mode="size" product={{title:product.title,handle:product.handle,selectedOptions:selected}}>FIND MY SIZE WITH AX <Icon name="arrow" size={17}/></StylistButton>
    <button ref={primaryButton} type="button" className="add-bag" disabled={!available||busy} onClick={add}>{buttonText}</button>
    {showSticky && <button type="button" className="mobile-sticky-add-bag" disabled={!available||busy} onClick={add}>{buttonText}</button>}
    {product.demo && <p className="cart-note">Sample catalog. Sizes and availability will appear when the store opens.</p>}
  </div>;
}
