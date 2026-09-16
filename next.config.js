const production = process.env.NODE_ENV === 'production';
const metaPixelConfigured=/^\d{5,30}$/.test(String(process.env.META_PIXEL_ID || '').trim());

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${production ? '' : " 'unsafe-eval'"}${metaPixelConfigured ? ' https://connect.facebook.net' : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${metaPixelConfigured ? ' https://www.facebook.com https://connect.facebook.net' : ''}${production ? '' : ' ws: http: https:'}`,
  "media-src 'self' blob: https:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "frame-src 'self' https://*.shopify.com https://*.myshopify.com",
  "form-action 'self' https://*.shopify.com https://*.myshopify.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  production ? 'upgrade-insecure-requests' : ''
].filter(Boolean).join('; ');

const securityHeaders = [
  {key:'Content-Security-Policy',value:contentSecurityPolicy},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), browsing-topics=()'},
  {key:'Cross-Origin-Opener-Policy',value:'same-origin-allow-popups'},
  {key:'X-DNS-Prefetch-Control',value:'off'},
  {key:'X-Permitted-Cross-Domain-Policies',value:'none'},
  {key:'Origin-Agent-Cluster',value:'?1'},
  ...(production ? [{key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'}] : [])
];

export default {
  poweredByHeader:false,
  reactStrictMode:true,
  async headers() {
    return [
      {source:'/:path*',headers:securityHeaders},
      {source:'/account/:path*',headers:[
        {key:'Cache-Control',value:'no-store, private'},
        {key:'X-Robots-Tag',value:'noindex, nofollow, noarchive'}
      ]},
      {source:'/api/:path*',headers:[
        {key:'Cache-Control',value:'no-store, private'},
        {key:'X-Robots-Tag',value:'noindex, nofollow, noarchive'}
      ]}
    ];
  }
};
