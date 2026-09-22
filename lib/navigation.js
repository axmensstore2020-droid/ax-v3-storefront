// Generic menswear categories from Zara India, reviewed 15 September 2026.
// Shopify's ax-categories menu overrides this initial list, including removals.
const category = (label,key) => ({label,key,href:`/collections/${key}`});
export const navigation = [
 {label:'New in',key:'all',href:'/products'},
 category('Best sellers','best-sellers'),category('Autumn wardrobe','autumn-wardrobe'),
 category('Shirts','shirts'),category('T-shirts','t-shirts'),category('Trousers','trousers'),category('Jeans','jeans'),
 category('Shorts | Jorts','shorts-jorts'),category('Linen | Linen blend','linen'),category('Jackets | Gilets','jackets-gilets'),
 category('Overshirts','overshirts'),category('Coats | Trench','coats-trench'),category('Long sleeve T-shirts','long-sleeve-t-shirts'),
 category('Sweatshirts | Sweatpants','sweatshirts-sweatpants'),category('Sweaters | Cardigans','sweaters-cardigans'),
 category('Suits','suits'),category('Blazers','blazers'),category('Polo shirts','polo-shirts'),category('Matching sets','matching-sets'),
 category('Perfumes','perfumes'),category('Special prices','special-prices'),category('Shoes','shoes'),category('Bags | Backpacks','bags-backpacks'),
 category('Swimwear','swimwear'),category('Underwear | Socks','underwear-socks'),category('Accessories','accessories')
];
export const styleWorlds = [
 category('Old money','old-money'),category('Korean fits','korean-fits'),category('Streetwear','streetwear'),
 category('Formal wear','formal-wear'),category('Casual fits','casual-fits'),category('Designer fits','designer-fits')
];
export const seasonalCollections = [
 {label:'New arrivals',key:'new-arrivals',href:'/products'},category('Winter Arc','winter-arc'),category('Summer Arc','summer-arc')
];
export const normalize = (value = '') => value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const productText = p => normalize([
 p.title,p.type,p.productNumber,p.productNumberDisplay,p.sku,p.variantSku,
 ...(p.variants||[]).flatMap(variant => [variant?.sku,variant?.title]),
 ...(p.tags||[]),p.description,p.fit,p.fabric,p.color,p.style
].filter(Boolean).join(' '));
export const canonicalStyle = key => ({korean:'korean-fits',street:'streetwear',formal:'formal-wear',casual:'casual-fits'}[key] || key);
export const categoryAliases = {'new-in':'all','new-arrivals':'all',new:'all',denim:'jeans',jackets:'jackets-gilets','wide-leg':'trousers','straight-leg':'trousers','formal-pants':'formal',hoodies:'sweatshirts-sweatpants'};
export function matchesCategory(p, category = 'all') {
 const text = productText(p), tee = /\b(t shirts?|tshirt|tee|polo)\b/.test(text);
 switch(categoryAliases[category] || category) {
  case 'all': return true;
  case 't-shirts': return tee;
  case 'shirts': return !tee && /\b(shirts?|flannels?)\b/.test(text);
  case 'trousers': return /\b(trousers?|pants?|wide leg|straight leg)\b/.test(text);
  case 'jeans': return /\b(denim|jeans?)\b/.test(text);
  case 'outerwear': return /\b(jackets?|hoodies?|coats?|outerwear)\b/.test(text);
  case 'formal': return /\b(formal|tailored|tailoring|suit|dress shirt)\b/.test(text);
  case 'accessories': return /\b(caps?|bags?|socks?|sunglasses|eyewear|watch|watches|chains?|belts?|rings?)\b/.test(text);
  case 'shorts-jorts': return /\b(shorts|jorts)\b/.test(text);
  case 'linen': return /\blinen\b/.test(text);
  case 'jackets-gilets': return /\b(jackets?|gilets?)\b/.test(text);
  case 'overshirts': return /\bovershirts?\b/.test(text);
  case 'coats-trench': return /\b(coats?|trench)\b/.test(text);
  case 'long-sleeve-t-shirts': return tee && /\b(long|full) sleeve\b/.test(text);
  case 'sweatshirts-sweatpants': return /\b(sweatshirts?|sweatpants?|hoodies?|joggers?)\b/.test(text);
  case 'sweaters-cardigans': return /\b(sweaters?|cardigans?|jumpers?)\b/.test(text);
  case 'suits': return /\bsuits?\b/.test(text);
  case 'blazers': return /\bblazers?\b/.test(text);
  case 'polo-shirts': return /\bpolo\b/.test(text);
  case 'matching-sets': return /\b(matching set|co ord|co ords|coord)\b/.test(text);
  case 'perfumes': return /\b(perfume|fragrance|eau de|parfum)\b/.test(text);
  case 'shoes': return /\b(shoes?|sneakers?|loafers?|boots?|sandals?|trainers?)\b/.test(text);
  case 'bags-backpacks': return /\b(bags?|backpacks?)\b/.test(text);
  case 'swimwear': return /\b(swimwear|swim shorts|swimming trunks)\b/.test(text);
  case 'underwear-socks': return /\b(underwear|socks?|boxers?|briefs?)\b/.test(text);
  // Campaigns and offers need explicit merchandising; never invent stock.
  default: return (p.tags || []).some(tag => normalize(tag) === normalize(category));
 }
}
export function matchesStyle(p, style = '') {
 if (!style) return true;
 const terms = {
  'old-money':['old money'],'korean-fits':['korean'],'streetwear':['streetwear','street','oversized','racing','cargo'],
  'formal-wear':['formal','tailoring','tailored','suit'],'casual-fits':['casual','everyday'],'designer-fits':['designer'],
  'old-school':['old school','old money','polo','flannel'],linen:['linen'],tailoring:['tailoring','tailored','formal'],
  essentials:['essential','plain','solid','polo'],vacation:['vacation','linen','resort']
 };
 return (terms[canonicalStyle(style)] || [normalize(style)]).some(term => ` ${productText(p)} `.includes(` ${term} `));
}
export const matchesSearch = (p, q) => normalize(q).split(' ').filter(Boolean).every(term => productText(p).includes(term));
export function flattenNavigation(items) {return items.flatMap(item => [item,...flattenNavigation(item.items || [])]);}
