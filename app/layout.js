import './globals.css';
import './refinements.css';
import './conversion.css';
import {CartProvider} from '../components/CartProvider';
import {StylistProvider} from '../components/StylistProvider';
import CartDrawerMount from '../components/CartDrawerMount';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AXIsland from '../components/AXIsland';
import MetaMarketing from '../components/MetaMarketing';
import WebVitals from '../components/WebVitals';
import {shopifyConfigured} from '../lib/shopify';
import {customerAccountConfigured} from '../lib/customer-account';
import {getNavigation} from '../lib/content';
import NavigationProvider from '../components/NavigationProvider';
import {metaCapiConfigured,metaPixelId} from '../lib/meta';
import {SITE_NAME,SITE_URL,jsonLd,organizationJsonLd,websiteJsonLd} from '../lib/seo';
const indexing=process.env.AX_ALLOW_INDEXING==='true';
export const metadata = {
 metadataBase:new URL(SITE_URL),
 applicationName:SITE_NAME,
 title:{default:'AX Men’s Store — Menswear, in your own way',template:'%s | AX Men’s Store'},
 description:'Discover shirts, Korean fits, relaxed tailoring, denim and everyday essentials. Menswear curated in Coimbatore, delivered across India.',
 icons:{icon:'/ax-logo.jpg'},
 openGraph:{siteName:SITE_NAME,type:'website',locale:'en_IN',images:[{url:'/ax-logo.jpg'}]},
 twitter:{card:'summary_large_image',images:['/ax-logo.jpg']},
 robots:{index:indexing,follow:indexing,googleBot:{index:indexing,follow:indexing,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1}},
 verification:process.env.GOOGLE_SITE_VERIFICATION?{google:process.env.GOOGLE_SITE_VERIFICATION}:undefined
};
export const revalidate=60;
export const viewport = {width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#f7f7f4'};
export default async function RootLayout({children}) {
 const navigation=await getNavigation();
 const demo=!shopifyConfigured(), domain=process.env.SHOPIFY_STORE_DOMAIN,customAccount=customerAccountConfigured();
 const accountUrl=customAccount?'/account':!demo && /^[a-z0-9-]+\.myshopify\.com$/.test(domain || '') ? 'https://'+domain+'/account' : '';
 const pixelId=metaPixelId(),capiEnabled=metaCapiConfigured();
 const analyticsSecret=process.env.AX_ANALYTICS_SECRET || process.env.AX_STYLIST_SECRET || '';
 const analyticsEnabled=Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) && analyticsSecret.length>=32);
 const configuredThreshold=Number(process.env.AX_FREE_SHIPPING_THRESHOLD || 0),freeShippingThreshold=Number.isFinite(configuredThreshold)&&configuredThreshold>0?configuredThreshold:0;
 const structured=[organizationJsonLd(),websiteJsonLd()];
 return <html lang="en-IN"><head><link rel="preconnect" href="https://cdn.shopify.com" crossOrigin="anonymous"/></head><body><WebVitals/><MetaMarketing pixelId={pixelId} capiEnabled={capiEnabled} analyticsEnabled={analyticsEnabled}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(structured)}}/><a className="skip-link" href="#main-content">Skip to content</a><NavigationProvider value={navigation}><CartProvider demo={demo} freeShippingThreshold={freeShippingThreshold}><StylistProvider>{demo && <div className="preview-banner">STORE PREVIEW · SAMPLE CATALOG · CHECKOUT UNAVAILABLE</div>}<Header/>{children}<Footer/><AXIsland accountUrl={accountUrl} accountEnabled={customAccount}/><CartDrawerMount/></StylistProvider></CartProvider></NavigationProvider></body></html>;
}
