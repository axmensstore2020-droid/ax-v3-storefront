import {normalize,productText} from './navigation.js';

function kind(product){
  const text=' '+productText(product)+' ';
  if(/\b(jeans?|trousers?|pants?|sweatpants?|joggers?|shorts|jorts|cargo)\b/.test(text)) return 'bottom';
  if(/\b(jackets?|gilets?|coats?|overshirts?|hoodies?)\b/.test(text)) return 'layer';
  if(/\b(caps?|bags?|sunglasses|eyewear|watch|watches|chains?|belts?|rings?|shoes?|sneakers?)\b/.test(text)) return 'accessory';
  return 'top';
}
function overlap(a,b){
  const left=new Set((a.tags||[]).map(normalize).filter(Boolean));
  return (b.tags||[]).map(normalize).filter(Boolean).filter(tag=>left.has(tag)).length;
}
export function complementaryProducts(product,products,limit=3){
  const sourceKind=kind(product);
  const priorities={
    top:{bottom:60,accessory:45,layer:22,top:5},
    bottom:{top:60,layer:40,accessory:35,bottom:5},
    layer:{top:55,bottom:50,accessory:30,layer:5},
    accessory:{top:40,bottom:35,layer:30,accessory:5}
  }[sourceKind];
  return products.filter(item=>item.handle!==product.handle && item.availableForSale!==false).map(item=>{
    let score=priorities[kind(item)]||0;
    score+=overlap(product,item)*7;
    if(product.style && item.style && normalize(product.style)===normalize(item.style)) score+=14;
    if(product.color && item.color && normalize(product.color)===normalize(item.color)) score+=4;
    return {item,score};
  }).sort((a,b)=>b.score-a.score || String(a.item.title).localeCompare(String(b.item.title))).slice(0,limit).map(entry=>entry.item);
}
