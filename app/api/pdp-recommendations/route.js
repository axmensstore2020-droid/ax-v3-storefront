import {getCompleteLookProducts,getMerchandisingProducts,getProduct} from '../../../lib/shopify.js';
import {complementaryProducts} from '../../../lib/merchandising.js';
import {catalogJson,guardCatalogRead} from '../../../lib/catalog-route.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const HANDLE_RE=/^[a-z0-9][a-z0-9-]{0,179}$/;

function publicProduct(product){
  return {
    id:product.id,handle:product.handle,title:product.title,type:product.type||'',
    tags:product.tags||[],image:product.image||'',imageAlt:product.imageAlt||product.title,
    price:Number(product.price||0),currency:product.currency||'INR',
    compareAtPrice:Number(product.compareAtPrice||0)||null,
    availableForSale:product.availableForSale!==false,color:product.color||'',
    colorGroup:product.colorGroup||'',style:product.style||''
  };
}

export async function GET(request){
  const access=await guardCatalogRead(request,{limit:40});
  if(access.response)return access.response;
  const {guard}=access,url=new URL(request.url);
  const handle=String(url.searchParams.get('handle')||'').trim().toLowerCase();
  if(!HANDLE_RE.test(handle))return catalogJson({error:'Invalid product.'},400,guard);
  try{
    const [product,catalog]=await Promise.all([getProduct(handle),getMerchandisingProducts(80)]);
    if(!product)return catalogJson({error:'Product not found.'},404,guard);
    const colourGroup=String(product.colorGroup||'').trim().toLowerCase();
    const colourwayListings=colourGroup?catalog.filter(item=>item.handle!==handle&&String(item.colorGroup||'').trim().toLowerCase()===colourGroup):[];
    const colourways=[product,...colourwayListings].map(publicProduct);
    const excluded=new Set([handle,...colourwayListings.map(item=>item.handle)]);
    let candidates=complementaryProducts(product,catalog.filter(item=>!excluded.has(item.handle)),3);
    if(!candidates.length)candidates=catalog.filter(item=>!excluded.has(item.handle)&&item.availableForSale!==false).slice(0,3);
    let full=[];
    if(candidates.length){try{full=await getCompleteLookProducts(candidates.map(item=>item.handle));}catch{}}
    const fullByHandle=new Map(full.map(item=>[item.handle,item]));
    const completeLook=candidates.map(item=>fullByHandle.get(item.handle)).filter(Boolean);
    const preview=candidates.map(publicProduct);
    const related=catalog.filter(item=>!excluded.has(item.handle)&&!candidates.some(candidate=>candidate.handle===item.handle)&&item.availableForSale!==false).slice(0,4).map(publicProduct);
    return catalogJson({colourways,completeLook,preview,related},200,guard);
  }catch{return catalogJson({colourways:[],completeLook:[],preview:[],related:[]},200,guard);}
}