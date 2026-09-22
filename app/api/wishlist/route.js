import {getProductsByHandles} from '../../../lib/shopify.js';
import {publicProductSummary} from '../../../lib/product-summary.js';
import {normalizeWishlist} from '../../../lib/wishlist.js';
import {catalogJson,guardCatalogRead} from '../../../lib/catalog-route.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request){
  const access=await guardCatalogRead(request);if(access.response)return access.response;
  const {guard}=access,url=new URL(request.url);
  const handles=normalizeWishlist((url.searchParams.get('handles')||'').split(','));
  if(!handles.length) return catalogJson({items:[]},200,guard);
  try{
    const products=await getProductsByHandles(handles);
    return catalogJson({items:products.map(publicProductSummary)},200,guard);
  }catch{
    return catalogJson({items:[]},502,guard);
  }
}
