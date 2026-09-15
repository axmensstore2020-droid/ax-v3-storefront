export const isStoreProduct=p => !/^partial\s+payment$/i.test(p.title?.trim() || '');
export const findVariant=(variants,selected) => variants.find(v => v.selectedOptions.every(o => selected[o.name]===o.value));
export function validateCartInput(body) {
 if(!body || typeof body!=='object' || Array.isArray(body)) return 'Invalid request.';
 const {action,cartId,merchandiseId,lineId,quantity=1}=body;
 if(!['get','create','add','update','remove'].includes(action)) return 'Unknown cart action.';
 if(action!=='create' && (typeof cartId!=='string' || !cartId.startsWith('gid://shopify/Cart/') || cartId.length>1024)) return 'Invalid bag.';
 if(['create','add'].includes(action) && (typeof merchandiseId!=='string' || !/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(merchandiseId))) return 'Choose a valid product option.';
 if(['update','remove'].includes(action) && (typeof lineId!=='string' || !lineId.startsWith('gid://shopify/CartLine/') || lineId.length>1024)) return 'Invalid bag item.';
 if(['create','add','update'].includes(action) && (!Number.isInteger(quantity) || quantity<(action==='update'?0:1) || quantity>99)) return 'Invalid quantity.';
 return null;
}
