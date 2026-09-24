import {findVariant} from './commerce.js';
import {productOptions,visibleOptions} from './product-variants.js';

export function completeLookState({product,mainVariant,mainSelection={},items=[],selections={},bagVariantIds=[]}={}) {
 const mainOptions=visibleOptions(productOptions(product || {}));
 const missingMain=mainOptions.find(option=>!mainSelection[option.name]);
 const mainAvailable=!missingMain && Boolean(mainVariant) && (product?.demo || mainVariant.availableForSale);
 const resolved=items.map(item=>({product:item,variant:findVariant(item.variants||[],selections[item.handle]||{})}));
 const selected=resolved.filter(item=>Boolean(item.variant) && (item.product.demo || item.variant.availableForSale));
 const mainLine=mainAvailable?{merchandiseId:mainVariant.id,variant:mainVariant,product}:null;
 const linesToAdd=mainLine?[mainLine,...selected.map(item=>({merchandiseId:item.variant.id,variant:item.variant,product:item.product}))]:[];
 const bag=bagVariantIds instanceof Set?bagVariantIds:new Set(bagVariantIds || []);
 const pending=linesToAdd.filter(item=>!bag.has(item.merchandiseId));
 const ready=mainAvailable && selected.length>0;
 const allInBag=ready && pending.length===0;
 const pendingTotal=pending.reduce((sum,item)=>sum+Number(item.variant?.price?.amount||item.product.price||0),0);
 const bundleTotal=linesToAdd.reduce((sum,item)=>sum+Number(item.variant?.price?.amount||item.product.price||0),0);
 const currency=mainVariant?.price?.currencyCode || product?.currency || selected[0]?.variant?.price?.currencyCode || 'INR';
 return {missingMain,mainAvailable,resolved,selected,linesToAdd,pending,ready,allInBag,pendingTotal,bundleTotal,currency};
}
