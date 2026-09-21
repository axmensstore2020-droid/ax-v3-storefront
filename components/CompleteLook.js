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
    <Link href={variantHref(product.handle,variant?.id)} className="look-image" onClick={()=>trackStoreEvent('recommendation_click',{productHandle:product.handle,metadata:{surface:'complete-look'}})}><ProductImage src={image} alt={product.title} sizes="(max-width:700px) 42vw,16vw"/></Link>
    <div className="look-copy"><Link href={`/products/${product.handle}`} onClick={()=>trackStoreEvent('recommendation_click',{productHandle:product.handle,metadata:{surface:'complete-look'}})}>{product.title}</Link><p>{formatMoney(Number(variant?.price?.amount||product.price),variant?.price?.currencyCode||product.currency)}</p>
      {options.map(option=><label key={option.name}><span>{option.name}</span><select value={selection[option.name]||''} onChange={e=>onChange(option.name,e.target.value)}><option value="">Choose</option>{option.values.map(value=><option value={value} key={value}>{value}</option>)}</select></label>)}
    </div>
  </article>;
}

export default function CompleteLook({product,mainVariant,mainSelection={},items=[]}){
  const {addItems,busy,setOpen,cart,demoLines,demo}=useCart();
  const [selections,setSelections]=useState(()=>Object.fromEntries(items.map(item=>[item.handle,initialSelection(item,'',true)])));
  const resolved=useMemo(()=>items.map(item=>({product:item,variant:findVariant(item.variants||[],selections[item.handle]||{})})),[items,selections]);
  if(!items.length)return null;

  const mainOptions=visibleOptions(productOptions(product));
  const missingMain=mainOptions.find(option=>!mainSelection[option.name]);
  const mainAvailable=!missingMain && Boolean(mainVariant) && (product.demo || mainVariant.availableForSale);
  const selected=resolved.filter(item=>Boolean(item.variant) && (item.product.demo || item.variant.availableForSale));
  const mainLine=mainAvailable?{merchandiseId:mainVariant.id,variant:mainVariant,product}:null;
  const linesToAdd=mainLine?[mainLine,...selected.map(item=>({merchandiseId:item.variant.id,variant:item.variant,product:item.product}))]:[];
  const bagVariantIds=new Set(demo
    ? demoLines.map(line=>line.variant?.id||line.key).filter(Boolean)
    : (cart?.lines?.nodes||[]).map(line=>line.merchandise?.id).filter(Boolean));
  const pending=linesToAdd.filter(item=>!bagVariantIds.has(item.merchandiseId));
  const ready=mainAvailable && selected.length>0;
  const allInBag=ready && pending.length===0;
  const pendingTotal=pending.reduce((sum,item)=>sum+Number(item.variant?.price?.amount||item.product.price||0),0);
  const bundleTotal=linesToAdd.reduce((sum,item)=>sum+Number(item.variant?.price?.amount||item.product.price||0),0);
  const currency=mainVariant?.price?.currencyCode || product.currency || selected[0]?.variant?.price?.currencyCode || 'INR';

  async function addLook(){
    if(allInBag){setOpen(true);return;}
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
    <div className="section-head"><div><p className="eyebrow">PAIR WITH THIS PIECE</p><h2 id="complete-look-title" className="editorial">Complete the look.</h2></div><p className="muted small">Choose the size/colour for the pieces you want. Your selected main item is included automatically.</p></div>
    <div className="look-grid">{items.map(item=><LookItem key={item.id} product={item} selection={selections[item.handle]||{}} onChange={(name,value)=>setSelections(current=>({...current,[item.handle]:{...(current[item.handle]||{}),[name]:value}}))}/>)}</div>
    <button className="solid-button add-look-button" type="button" disabled={(!ready&&!allInBag)||busy} onClick={addLook}>{buttonText}</button>
  </section>;
}
