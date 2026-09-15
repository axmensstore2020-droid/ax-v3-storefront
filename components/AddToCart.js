'use client';
import {useState} from 'react';
import {useCart} from './CartProvider';
import {StylistButton} from './StylistProvider';
import {formatMoney} from '../lib/catalog';
import {findVariant} from '../lib/commerce';
import Icon from './Icon';

export default function AddToCart({product}) {
  const {addItem,busy}=useCart(),options=product.options||[],variants=product.variants||[],initial=variants.find(v=>v.availableForSale)||variants[0];
  const [selected,setSelected]=useState(()=>Object.fromEntries(initial?.selectedOptions?.map(o=>[o.name,o.value])||[]));
  const variant=findVariant(variants,selected),available=product.demo||Boolean(variant?.availableForSale),price=variant?Number(variant.price.amount):product.price;
  const sizeOption=options.find(option=>/^size$/i.test(option.name)),selectedSize=sizeOption && selected[sizeOption.name],sizeFit=selectedSize ? product.sizeFits?.[selectedSize] : null;
  return <div className="buy-box">
    <div className="pdp-price-row"><strong>{formatMoney(price,variant?.price?.currencyCode||product.currency)}</strong><span>{product.demo?'Sample piece':available?'Available':'Sold out'}</span></div>
    {options.filter(o=>!(o.name==='Title'&&o.values.length===1&&o.values[0]==='Default Title')).map(option=><fieldset className="option-block" key={option.name}>
      <legend>{option.name}: {selected[option.name]||'Choose an option'}</legend>
      <div className="option-values">{option.values.map(value=>{const possible=findVariant(variants,{...selected,[option.name]:value});return <button key={value} aria-pressed={selected[option.name]===value} className={`${selected[option.name]===value?'selected':''} ${possible?.availableForSale?'':'unavailable'}`} onClick={()=>setSelected(current=>({...current,[option.name]:value}))}>{value}<span className="sr-only">{possible?.availableForSale?'':' — unavailable with this selection'}</span></button>;})}</div>
    </fieldset>)}
    {sizeOption && sizeFit?.text && <div className="size-recommendation" aria-live="polite"><p><strong>{selectedSize}</strong> · {sizeFit.text}</p><span>AX’s garment note—not a personal size recommendation.</span></div>}
    <StylistButton className="find-size" mode="size" product={{title:product.title,handle:product.handle,selectedOptions:selected}}>FIND MY SIZE WITH AX <Icon name="arrow" size={17}/></StylistButton>
    <button className="add-bag" disabled={!available||busy} onClick={()=>addItem({merchandiseId:variant?.id,product})}>{busy?'UPDATING BAG…':product.demo?'ADD TO PREVIEW BAG':available?'ADD TO BAG':'UNAVAILABLE'}</button>
    {product.demo && <p className="cart-note">Sample catalog. Sizes and availability will appear when the store opens.</p>}
  </div>;
}
