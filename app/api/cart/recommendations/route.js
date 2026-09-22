import {getProducts} from '../../../../lib/shopify.js';
import {complementaryProducts} from '../../../../lib/merchandising.js';
import {catalogJson,guardCatalogRead} from '../../../../lib/catalog-route.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const HANDLE_RE=/^[a-z0-9][a-z0-9-]{0,127}$/;

function safeProduct(product){
  return {
    handle:product.handle,
    title:product.title,
    image:product.image,
    imageAlt:product.imageAlt || product.title,
    price:Number(product.price || 0),
    currency:product.currency || 'INR',
    compareAtPrice:Number(product.compareAtPrice || 0) || null,
    availableForSale:product.availableForSale!==false
  };
}

export async function GET(request){
  const access=await guardCatalogRead(request,{limit:60});if(access.response)return access.response;
  const {guard}=access,url=new URL(request.url);
  const handles=(url.searchParams.get('handles')||'')
    .split(',')
    .map(value=>value.trim().toLowerCase())
    .filter(value=>HANDLE_RE.test(value))
    .slice(0,5);
  if(!handles.length) return catalogJson({items:[]},200,guard);

  try{
    const catalog=await getProducts(100);
    const inBag=new Set(handles);
    const sources=handles.map(handle=>catalog.find(item=>item.handle===handle)).filter(Boolean);
    const picked=[],seen=new Set(handles);

    for(const source of sources){
      for(const item of complementaryProducts(source,catalog,8)){
        if(seen.has(item.handle) || inBag.has(item.handle) || item.availableForSale===false) continue;
        seen.add(item.handle);
        picked.push(safeProduct(item));
        if(picked.length>=4) break;
      }
      if(picked.length>=4) break;
    }

    if(picked.length<4){
      for(const item of catalog){
        if(seen.has(item.handle) || item.availableForSale===false) continue;
        seen.add(item.handle);
        picked.push(safeProduct(item));
        if(picked.length>=4) break;
      }
    }

    return catalogJson({items:picked},200,guard);
  }catch{
    return catalogJson({items:[]},200,guard);
  }
}
