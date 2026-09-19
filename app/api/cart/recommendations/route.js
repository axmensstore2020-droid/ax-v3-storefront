import {NextResponse} from 'next/server';
import {getProducts} from '../../../../lib/shopify.js';
import {complementaryProducts} from '../../../../lib/merchandising.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const HANDLE_RE=/^[a-z0-9][a-z0-9-]{0,127}$/;

function safeProduct(product){
  return {
    id:product.id,
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
  const url=new URL(request.url);
  const handles=(url.searchParams.get('handles')||'')
    .split(',')
    .map(value=>value.trim().toLowerCase())
    .filter(value=>HANDLE_RE.test(value))
    .slice(0,5);
  if(!handles.length) return NextResponse.json({items:[]},{headers:{'Cache-Control':'no-store, private'}});

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

    return NextResponse.json({items:picked},{headers:{'Cache-Control':'no-store, private'}});
  }catch{
    return NextResponse.json({items:[]},{headers:{'Cache-Control':'no-store, private'}});
  }
}
