import {SITE_URL} from '../lib/seo';

export default function robots(){
 const indexing=process.env.AX_ALLOW_INDEXING==='true';
 return {
  rules:indexing
   ? [{userAgent:'*',allow:'/',disallow:['/api/','/account/']}]
   : [{userAgent:'*',disallow:'/'}],
  ...(indexing?{sitemap:`${SITE_URL}/sitemap.xml`,host:SITE_URL}:{})
 };
}
