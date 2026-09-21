import {NextResponse} from 'next/server';
import {createDatabase,databaseConfigured} from '../../../../lib/stylist/database.js';
import {restockSecret} from '../../../../lib/restock-config.js';
import {normalizeRestockVerificationToken,restockVerificationHash} from '../../../../lib/restock-verification.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request){
  const url=new URL(request.url),token=normalizeRestockVerificationToken(url.searchParams.get('token'));
  const origin=process.env.AX_PUBLIC_SITE_URL || url.origin;
  if(!token || !databaseConfigured() || restockSecret().length<32) return NextResponse.redirect(new URL('/products?restock=invalid',origin),303);
  try{
    const row=await createDatabase().confirmRestockSubscription(restockVerificationHash(token,restockSecret()));
    if(!row?.product_handle) return NextResponse.redirect(new URL('/products?restock=invalid',origin),303);
    const target=new URL('/products/'+encodeURIComponent(row.product_handle),origin);
    target.searchParams.set('restock','confirmed');
    return NextResponse.redirect(target,303);
  }catch{
    return NextResponse.redirect(new URL('/products?restock=invalid',origin),303);
  }
}
