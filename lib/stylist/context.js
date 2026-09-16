export function boundedHistory(history,config) {
  let remaining=config.maxContextChars;
  return history.slice(-config.maxContextMessages).reverse().flatMap(item=>{
    if (!['user','assistant'].includes(item.role)||!remaining) return [];
    const content=String(item.content||'').slice(0,Math.min(1200,remaining));remaining-=content.length;
    return [{role:item.role,content}];
  }).reverse();
}
export function relevantProfile(profile,intent) {
  if (!['styling','fit','comparison','photo_styling','conversation'].includes(intent)) return {};
  const keys=intent==='fit'?['unit','chest','waist','hip','inseam','fit','usualSize','avoid']:['fit','styles','colors','avoid','usualSize'];
  return Object.fromEntries(keys.filter(key=>profile?.[key]!==undefined && profile[key]!=='').map(key=>[key,profile[key]]));
}
// Bounded extractive memory in the signed browser token; no extra model call
// and no transcript table. Older text is explicitly untrusted conversation data.
export function compactContext(previous,history,config) {
  const older=history.slice(0,-config.maxContextMessages);
  const useful=older.filter(item=>item.role==='user' && /prefer|like|avoid|budget|occasion|looking|need|want|wear|fit|size|colour|color|style/i.test(item.content||'')).map(item=>String(item.content).slice(0,160));
  return [previous,...useful].filter(Boolean).join(' | ').slice(-700);
}
export function modelProduct(product,config,selected={}) {
  if (!product) return null;
  const {handle,title,productNumber,description,type,fit,fabric,color,style,care,availableForSale,price,options}=product;
  let variants=product.variants||[];
  const colorEntries=Object.entries(selected).filter(([key])=>/^colou?r$/i.test(key));
  if (colorEntries.length) variants=variants.filter(v=>colorEntries.every(([name,value])=>v.selectedOptions?.some(o=>o.name===name&&o.value===value)));
  return {handle,title,productNumber,description:String(description||'').slice(0,240),type,fit,fabric,color,style,care,availableForSale,price,options,
    variants:variants.slice(0,24).map(({id,selectedOptions,availableForSale,price})=>({id,selectedOptions,availableForSale,price})),moreVariants:variants.length>24};
}
export function toolContext(value,config,selected={}) {
  let result=value;
  if (value?.products) result={...value,products:value.products.slice(0,config.searchResults).map(p=>modelProduct(p,config))};
  else if (value?.handle && value?.variants) result=modelProduct(value,config,selected);
  if(value?.policies) {
    const allowance=Math.min(2500,Math.floor((config.maxToolChars-800)/Math.max(1,value.policies.length)));
    result={...value,policies:value.policies.map(p=>({...p,text:p.text.slice(0,allowance),excerpt:p.text.length>allowance})),notice:'Consult the linked full policy for details not present in these excerpts; do not promise eligibility.'};
  }
  const text=JSON.stringify(result);
  // Never cut JSON mid-field and accidentally present an incomplete variant.
  return text.length<=config.maxToolChars?text:JSON.stringify({notice:'Result is too large. Narrow the search or ask about one size or colour.',truncated:true});
}
