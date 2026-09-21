import {NextResponse} from 'next/server';
import {getProductsByHandles} from '../../../lib/shopify.js';
import {publicProductSummary} from '../../../lib/product-summary.js';
import {normalizeWishlist} from '../../../lib/wishlist.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request){
  const url=new URL(request.url);
  const handles=normalizeWishlist((url.searchParams.get('handles')||'').split(','));
  if(!handles.length) return NextResponse.json({items:[]},{headers:{'Cache-Control':'no-store, private'}});
  try{
    const products=await getProductsByHandles(handles);
    return NextResponse.json({items:products.map(publicProductSummary)},{headers:{'Cache-Control':'no-store, private'}});
  }catch{
    return NextResponse.json({items:[]},{status:502,headers:{'Cache-Control':'no-store, private'}});
  }
}
