export const isStoreProduct=p => !/^partial\s+payment$/i.test(p.title?.trim() || '');
export const findVariant=(variants,selected) => variants.find(v => v.selectedOptions?.length && v.selectedOptions.length === Object.keys(selected).length && v.selectedOptions.every(o => selected[o.name]===o.value));
export function validateCartInput(body) {
 if(!body || typeof body!=='object' || Array.isArray(body)) return 'Invalid request.';
 const {action,cartId,merchandiseId,lineId,quantity=1,lines}=body;
 if(!['get','create','createMany','buyNow','add','addMany','update','remove'].includes(action)) return 'Unknown cart action.';
 if(!['create','createMany','buyNow'].includes(action) && (typeof cartId!=='string' || !cartId.startsWith('gid://shopify/Cart/') || cartId.length>1024)) return 'Invalid bag.';
 if(['create','add','buyNow'].includes(action) && (typeof merchandiseId!=='string' || !/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(merchandiseId))) return 'Choose a valid product option.';
 if(['createMany','addMany'].includes(action)) {
  if(!Array.isArray(lines) || !lines.length || lines.length>10) return 'Choose valid product options.';
  for(const item of lines) if(!item || typeof item.merchandiseId!=='string' || !/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(item.merchandiseId) || !Number.isInteger(item.quantity) || item.quantity<1 || item.quantity>99) return 'Choose valid product options.';
 }
 if(['update','remove'].includes(action) && (typeof lineId!=='string' || !lineId.startsWith('gid://shopify/CartLine/') || lineId.length>1024)) return 'Invalid bag item.';
 if(['create','add','buyNow','update'].includes(action) && (!Number.isInteger(quantity) || quantity<(action==='update'?0:1) || quantity>99)) return 'Invalid quantity.';
 return null;
}
