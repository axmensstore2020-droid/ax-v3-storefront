import 'server-only';
import {NextResponse} from 'next/server';
import {CATALOG_GUARD_COOKIE,reserveCatalogBurst} from './request-security.js';
import {reserveProviderBudget} from './provider-budget.js';

export function catalogJson(body,status=200,guard=null,extra={}){
  const response=NextResponse.json(body,{status,headers:{
    'Cache-Control':'no-store, private',
    'X-Content-Type-Options':'nosniff',
    'Cross-Origin-Resource-Policy':'same-origin',
    ...extra
  }});
  if(guard?.setCookie && guard.token) response.cookies.set(CATALOG_GUARD_COOKIE,guard.token,{
    httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api',maxAge:60*60
  });
  return response;
}

export async function guardCatalogRead(request,{limit=80,windowMs=60_000}={}){
  if(request.headers.get('sec-fetch-site')==='cross-site') {
    return {response:catalogJson({items:[],error:'Forbidden.'},403)};
  }
  const guard=reserveCatalogBurst(request,{limit,windowMs});
  if(!guard.allowed) return {guard,response:catalogJson({items:[],error:'Too many requests.'},429,guard,{'Retry-After':String(guard.retryAfter)})};
  const daily=Math.min(100000,Math.max(500,Number(process.env.AX_CATALOG_READ_DAILY_LIMIT)||20000));
  const budget=await reserveProviderBudget('catalog-read',{limit:daily});
  if(!budget.allowed) return {guard,response:catalogJson({items:[],error:'Catalog reads are temporarily limited.'},429,guard)};
  return {guard};
}
