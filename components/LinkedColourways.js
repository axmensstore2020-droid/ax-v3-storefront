'use client';
import Link from 'next/link';
import {swatchColor} from '../lib/color';

function clean(value=''){
 return String(value||'').trim();
}

export default function LinkedColourways({product,items=[]}){
 const seen=new Set();
 const usable=[product,...items].filter(item=>{
  const handle=clean(item?.handle),color=clean(item?.color);
  if(!handle||!color||seen.has(handle))return false;
  seen.add(handle);
  return true;
 }).sort((a,b)=>{
  if(a.handle===product.handle)return -1;
  if(b.handle===product.handle)return 1;
  return clean(a.color).localeCompare(clean(b.color));
 });
 if(usable.length<2)return null;
 const currentColor=clean(product.color);
 return <fieldset className="pdp-colourways">
  <legend>Colour: <strong>{currentColor||'Selected'}</strong></legend>
  <div className="pdp-colourway-list">
   {usable.map(item=>{
    const active=item.handle===product.handle,color=clean(item.color);
    return <Link
     key={item.handle}
     href={active?`/products/${item.handle}`:`/products/${item.handle}?chooseSize=1`}
     className={`pdp-colourway${active?' selected':''}${item.availableForSale===false?' sold-out':''}`}
     aria-current={active?'page':undefined}
     aria-label={`${color}${active?', selected':''}`}
     title={color}
    >
     <span className="pdp-colourway-dot" style={{backgroundColor:swatchColor(color)}} aria-hidden="true"/>
     <span>{color}</span>
    </Link>;
   })}
  </div>
 </fieldset>;
}
