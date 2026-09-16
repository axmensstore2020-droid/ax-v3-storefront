import {NextResponse} from 'next/server';
import {customerAccountConfig,readAccountSession,sessionExpired} from '../../../lib/customer-account.js';

export const dynamic='force-dynamic';

export async function GET(request) {
  const config=customerAccountConfig();
  if(!config.enabled) return NextResponse.json({enabled:false,signedIn:false},{headers:{'Cache-Control':'no-store'}});
  const session=readAccountSession(request,config);
  return NextResponse.json({enabled:true,signedIn:Boolean(session && !sessionExpired(session,0))},{headers:{'Cache-Control':'no-store'}});
}
