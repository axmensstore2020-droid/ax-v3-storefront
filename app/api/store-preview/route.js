import {NextResponse} from 'next/server';
import {
  STORE_PREVIEW_COOKIE,
  STORE_PREVIEW_HINT_COOKIE,
  STORE_PREVIEW_EXPIRES_MS,
  createStorePreviewToken,
  storePreviewConfigured,
  storePreviewKeyValid
} from '../../../lib/store-preview.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const cookieOptions={
  path:'/',
  sameSite:'lax',
  secure:process.env.NODE_ENV==='production'
};

function redirectHome(request){
  return NextResponse.redirect(new URL('/',request.url),303);
}

export async function GET(request){
  const url=new URL(request.url);
  const response=redirectHome(request);
  response.headers.set('Cache-Control','no-store, max-age=0');
  response.headers.set('Referrer-Policy','no-referrer');

  if(url.searchParams.get('off')==='1'){
    response.cookies.set(STORE_PREVIEW_COOKIE,'',{...cookieOptions,httpOnly:true,maxAge:0});
    response.cookies.set(STORE_PREVIEW_HINT_COOKIE,'',{...cookieOptions,httpOnly:false,maxAge:0});
    return response;
  }

  if(Date.now()>=STORE_PREVIEW_EXPIRES_MS){
    return response;
  }

  const key=String(url.searchParams.get('key')||'');
  if(!storePreviewConfigured()||!storePreviewKeyValid(key)){
    return new Response('Not found.',{
      status:404,
      headers:{'Cache-Control':'no-store, max-age=0','Referrer-Policy':'no-referrer'}
    });
  }

  const token=createStorePreviewToken();
  if(!token){
    return new Response('Preview unavailable.',{
      status:503,
      headers:{'Cache-Control':'no-store, max-age=0','Referrer-Policy':'no-referrer'}
    });
  }

  const maxAge=Math.max(1,Math.floor((STORE_PREVIEW_EXPIRES_MS-Date.now())/1000));
  response.cookies.set(STORE_PREVIEW_COOKIE,token,{...cookieOptions,httpOnly:true,maxAge});
  response.cookies.set(STORE_PREVIEW_HINT_COOKIE,'1',{...cookieOptions,httpOnly:false,maxAge});
  return response;
}
