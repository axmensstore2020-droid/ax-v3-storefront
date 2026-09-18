'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import ProductImage from './ProductImage';
import {useCart} from './CartProvider';
import {findVariant} from '../lib/commerce';
import {initialSelection,productOptions,visibleOptions,variantHref} from '../lib/product-variants';
import {formatMoney} from '../lib/catalog';
import {trackStoreEvent} from '../lib/store-analytics';

function LookItem({product,selection,onChange}){
  const options=visibleOptions(productOptions(product)),variant=findVariant(product.variants||[],selection);
  const image=variant?.image?.url || product.image;
  return <article className="look-item">
    <Link href={variantHref(product.handle,variant?.id)} className="look-image"><ProductImage src={image} alt={product.title} sizes="(max-width:700px) 42vw,16vw"/></Link>
    <div className="look-copy"><Link href={`/products/${product.handle}`}>{product.title}</Link><p>{formatMoney(Number(variant?.price?.amount||product.price),variant?.price?.currencyCode||product.currency)}</p>
      {options.map(option=><label key={option.name}><span>{option.name}</span><select value={selection[option.name]||''} onChange={e=>onChange(option.name,e.target.value)}><option value="">Choose</option>{option.values.map(value=><option value={value} key={value}>{value}</option>)}</select></label>)}
    </div>
  </article>;
}

export default function CompleteLook({product,items=[]}){
  const {addItems,busy}=useCart();
  const [selections,setSelections]=useState(()=>Object.fromEntries(items.map(item=>[item.handle,initialSelection(item,'',true)])));
  const resolved=useMemo(()=>items.map(item=>({product:item,variant:findVariant(item.variants||[],selections[item.handle]||{})})),[items,selections]);
  if(!items.length)return null;
  const ready=resolved.every(item=>item.variant?.availableForSale);
  async function addLook(){
    if(!ready)return;
    await addItems(resolved.map(item=>({merchandiseId:item.variant.id,variant:item.variant,product:item.product})));
    trackStoreEvent('add_look',{productHandle:product.handle,metadata:{items:resolved.length}});
  }
  return <section className="complete-look section-wrap" aria-labelledby="complete-look-title">
    <div className="section-head"><div><p className="eyebrow">STYLE IT YOUR WAY</p><h2 id="complete-look-title" className="editorial">Complete the look.</h2></div><p className="muted small">Choose your options first. AX never guesses your size.</p></div>
    <div className="look-grid">{items.map(item=><LookItem key={item.id} product={item} selection={selections[item.handle]||{}} onChange={(name,value)=>setSelections(current=>({...current,[item.handle]:{...(current[item.handle]||{}),[name]:value}}))}/>)}</div>
    <button className="solid-button add-look-button" type="button" disabled={!ready||busy} onClick={addLook}>{busy?'UPDATING BAG…':ready?'ADD SELECTED LOOK':'CHOOSE OPTIONS TO ADD THE LOOK'}</button>
  </section>;
}
