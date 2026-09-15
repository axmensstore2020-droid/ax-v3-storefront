export const navigation = [
 { label:'New in', key:'all', href:'/products' },
 { label:'T-shirts', key:'t-shirts', href:'/collections/t-shirts' },
 { label:'Shirts', key:'shirts', href:'/collections/shirts' },
 { label:'Trousers', key:'trousers', href:'/collections/trousers' },
 { label:'Denim', key:'denim', href:'/collections/denim' },
 { label:'Outerwear', key:'outerwear', href:'/collections/outerwear' },
 { label:'Formal', key:'formal', href:'/collections/formal' },
 { label:'Accessories', key:'accessories', href:'/collections/accessories' }
];
export const styleWorlds = [
 { label:'Korean fits', key:'korean' }, { label:'Old school', key:'old-school' },
 { label:'Linen', key:'linen' }, { label:'Relaxed tailoring', key:'tailoring' },
 { label:'Essentials', key:'essentials' }, { label:'Street', key:'street' }, { label:'Vacation', key:'vacation' }
];
export const normalize = (value = '') => value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const productText = p => normalize([p.title,p.type,...(p.tags||[]),p.description].join(' '));
export function matchesCategory(p, category = 'all') {
 const text = productText(p), tee = /\b(t shirts?|tshirt|tee|polo)\b/.test(text);
 switch(category) {
  case 'all': return true;
  case 't-shirts': return tee;
  case 'shirts': return !tee && /\b(shirts?|flannels?)\b/.test(text);
  case 'trousers': return /\b(trousers?|pants?|wide leg|straight leg)\b/.test(text);
  case 'denim': return /\b(denim|jeans?)\b/.test(text);
  case 'outerwear': return /\b(jackets?|hoodies?|coats?|outerwear)\b/.test(text);
  case 'formal': return /\b(formal|tailored|tailoring|suit|dress shirt)\b/.test(text);
  case 'accessories': return /\b(caps?|bags?|socks?|sunglasses|eyewear|watch|watches|chains?|belts?|rings?)\b/.test(text);
  default: return false;
 }
}
export function matchesStyle(p, style = '') {
 if (!style) return true;
 const terms = {korean:['korean'],'old-school':['old school','old money','polo','flannel'],linen:['linen'],tailoring:['tailoring','tailored','formal'],essentials:['essential','plain','solid','polo'],street:['street','oversized','racing','cargo'],vacation:['vacation','linen','resort']};
 return (terms[style] || [normalize(style)]).some(term => productText(p).includes(term));
}
export const matchesSearch = (p, q) => normalize(q).split(' ').filter(Boolean).every(term => productText(p).includes(term));
