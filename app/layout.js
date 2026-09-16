import './globals.css';
import './refinements.css';
import {CartProvider} from '../components/CartProvider';
import {StylistProvider} from '../components/StylistProvider';
import CartDrawer from '../components/CartDrawer';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AXIsland from '../components/AXIsland';
import MetaMarketing from '../components/MetaMarketing';
import {shopifyConfigured} from '../lib/shopify';
import {customerAccountConfigured} from '../lib/customer-account';
import {getNavigation} from '../lib/content';
import NavigationProvider from '../components/NavigationProvider';
import {metaCapiConfigured,metaPixelId} from '../lib/meta';
import {SITE_NAME,SITE_URL,jsonLd,organizationJsonLd} from '../lib/seo';
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
 return <html lang="en-IN"><body><MetaMarketing pixelId={pixelId} capiEnabled={capiEnabled}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(organizationJsonLd())}}/><a className="skip-link" href="#main-content">Skip to content</a><NavigationProvider value={navigation}><CartProvider demo={demo}><StylistProvider>{demo && <div className="preview-banner">STORE PREVIEW · SAMPLE CATALOG · CHECKOUT UNAVAILABLE</div>}<Header/>{children}<Footer/><AXIsland accountUrl={accountUrl} accountEnabled={customAccount}/><CartDrawer/></StylistProvider></CartProvider></NavigationProvider></body></html>;
}
