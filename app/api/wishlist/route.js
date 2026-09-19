import {NextResponse} from 'next/server';
import {getProducts} from '../../../lib/shopify.js';
import {normalizeWishlist} from '../../../lib/wishlist.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

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
  const handles=normalizeWishlist((url.searchParams.get('handles')||'').split(','));
  if(!handles.length) return NextResponse.json({items:[]},{headers:{'Cache-Control':'no-store, private'}});
  try{
    const catalog=await getProducts(100);
    const byHandle=new Map(catalog.map(product=>[product.handle,product]));
    const items=handles.map(handle=>byHandle.get(handle)).filter(Boolean).map(safeProduct);
    return NextResponse.json({items},{headers:{'Cache-Control':'no-store, private'}});
  }catch{
    return NextResponse.json({items:[]},{status:502,headers:{'Cache-Control':'no-store, private'}});
  }
}
