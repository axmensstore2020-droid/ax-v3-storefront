'use client';
import {useState} from 'react';
import Link from 'next/link';
import ProductImage from './ProductImage';
import {useCart} from './CartProvider';
import {findVariant} from '../lib/commerce';
import {initialSelection,optionAvailable,productOptions,selectionAfterOption,visibleOptions,variantHref} from '../lib/product-variants';
import {completeLookState} from '../lib/complete-look';
import {formatMoney} from '../lib/catalog';
import {trackStoreEvent} from '../lib/store-analytics';

function LookItem({product,selection,onChange,onAdd,bagVariantIds,busy}){
  const options=visibleOptions(productOptions(product)),variant=findVariant(product.variants||[],selection);
  const image=variant?.image?.url || product.image;
  const missing=options.find(option=>!selection[option.name]);
  const available=!missing && Boolean(variant) && (product.demo || variant.availableForSale);
  const inBag=Boolean(variant?.id && bagVariantIds.has(variant.id));
  let actionText='ADD TO BAG';
  if(busy) actionText='UPDATING BAG…';
  else if(inBag) actionText='VIEW BAG';
  else if(missing) actionText=`CHOOSE ${missing.name.toUpperCase()}`;
  else if(!available) actionText=variant?.availableForSale===false?'SOLD OUT':'UNAVAILABLE';
  return <article className="look-item">
    <Link href={variantHref(product.handle,variant?.id)} className="look-image" onClick={()=>trackStoreEvent('recommendation_click',{productHandle:product.handle,metadata:{surface:'complete-look'}})}><ProductImage src={image} alt={product.title} sizes="(max-width:700px) 42vw,16vw"/></Link>
    <div className="look-copy"><Link href={`/products/${product.handle}`} onClick={()=>trackStoreEvent('recommendation_click',{productHandle:product.handle,metadata:{surface:'complete-look'}})}>{product.title}</Link><p>{formatMoney(Number(variant?.price?.amount||product.price),variant?.price?.currencyCode||product.currency)}</p>
      {options.map(option=><label key={option.name}><span>{option.name}</span><select value={selection[option.name]||''} onChange={e=>onChange(option.name,e.target.value)}><option value="">Choose</option>{option.values.map(value=>{const possible=optionAvailable(product.variants||[],selection,option.name,value);return <option value={value} key={value} disabled={!possible}>{value}{possible?'':' — unavailable'}</option>;})}</select></label>)}
      <button className="look-add-button" type="button" disabled={busy||(!available&&!inBag)} onClick={()=>onAdd({product,variant,inBag})}>{actionText}</button>
    </div>
  </article>;
}

export default function CompleteLook({product,mainVariant,mainSelection={},items=[]}){
  const {addItems,busy,openCart,cart,demoLines,demo}=useCart();
  const [selections,setSelections]=useState(()=>Object.fromEntries(items.map(item=>[item.handle,initialSelection(item,'',true)])));
  const bagVariantIds=new Set(demo
    ? demoLines.map(line=>line.variant?.id||line.key).filter(Boolean)
    : (cart?.lines?.nodes||[]).map(line=>line.merchandise?.id).filter(Boolean));
  const {missingMain,mainAvailable,pending,ready,allInBag,pendingTotal,bundleTotal,currency,linesToAdd}=completeLookState({
    product,mainVariant,mainSelection,items,selections,bagVariantIds
  });
  if(!items.length)return null;

  async function addPiece({product:item,variant,inBag}){
    if(inBag){openCart();return;}
    if(!variant || (!item.demo && !variant.availableForSale))return;
    const added=await addItems([{merchandiseId:variant.id,variant,product:item}]);
    if(added)trackStoreEvent('add_look_piece',{productHandle:item.handle,value:Number(variant?.price?.amount||item.price||0),currency:variant?.price?.currencyCode||item.currency||'INR',metadata:{variantId:variant.id}});
  }

  async function addLook(){
    if(allInBag){openCart();return;}
    if(!ready || !pending.length)return;
    const added=await addItems(pending);
    if(added) trackStoreEvent('add_look',{productHandle:product.handle,value:pendingTotal,currency,metadata:{items:pending.length,bundleItems:linesToAdd.length}});
  }

  let buttonText='CHOOSE OPTIONS TO ADD THE LOOK';
  if(busy) buttonText='UPDATING BAG…';
  else if(allInBag) buttonText='VIEW BAG';
  else if(missingMain) buttonText=`SELECT ${missingMain.name.toUpperCase()} ABOVE`;
  else if(!mainAvailable) buttonText='MAIN ITEM UNAVAILABLE';
  else if(ready){
    const amount=pendingTotal||bundleTotal;
    if(pending.length===2 && linesToAdd.length===2) buttonText=`ADD BOTH TO BAG — ${formatMoney(amount,currency)}`;
    else if(pending.length===1) buttonText=`ADD PIECE TO BAG — ${formatMoney(amount,currency)}`;
    else buttonText=`ADD ${pending.length} ITEMS TO BAG — ${formatMoney(amount,currency)}`;
  }

  return <section id="complete-look" className="complete-look section-wrap" aria-labelledby="complete-look-title">
    <div className="section-head"><div><p className="eyebrow">PAIR WITH THIS PIECE</p><h2 id="complete-look-title" className="editorial">Complete the look.</h2></div><p className="muted small">Choose the size/colour for the pieces you want. Add one piece directly, or add the selected main item and matching pieces together.</p></div>
    <div className="look-grid">{items.map(item=><LookItem key={item.id} product={item} selection={selections[item.handle]||{}} bagVariantIds={bagVariantIds} busy={busy} onAdd={addPiece} onChange={(name,value)=>setSelections(current=>({...current,[item.handle]:selectionAfterOption(item.variants||[],current[item.handle]||{},name,value)}))}/>)}</div>
    <button className="solid-button add-look-button" type="button" disabled={(!ready&&!allInBag)||busy} onClick={addLook}>{buttonText}</button>
  </section>;
}
