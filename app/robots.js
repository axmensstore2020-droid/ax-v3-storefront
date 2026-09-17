import {SITE_URL} from '../lib/seo';

export default function robots(){
 const indexing=process.env.AX_ALLOW_INDEXING==='true';
 const privatePaths=['/api/','/account','/account/'];
 return {
  rules:indexing
   ? [
      {userAgent:'*',allow:'/',disallow:privatePaths},
      // ChatGPT search discovery uses OAI-SearchBot. Keep commerce/account endpoints private.
      {userAgent:'OAI-SearchBot',allow:'/',disallow:privatePaths}
     ]
   : [{userAgent:'*',disallow:'/'}],
  ...(indexing?{sitemap:`${SITE_URL}/sitemap.xml`,host:SITE_URL}:{})
 };
}
