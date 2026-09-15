import './globals.css';
import './refinements.css';
import {CartProvider} from '../components/CartProvider';
import {StylistProvider} from '../components/StylistProvider';
import CartDrawer from '../components/CartDrawer';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AXIsland from '../components/AXIsland';
import {shopifyConfigured} from '../lib/shopify';
import {getNavigation} from '../lib/content';
import NavigationProvider from '../components/NavigationProvider';
export const metadata = {
 title:{default:'AX Men’s Store — Menswear, in your own way',template:'%s | AX Men’s Store'},
 description:'Discover shirts, Korean fits, relaxed tailoring, denim and everyday essentials. Menswear curated in Coimbatore, delivered across India.',
 icons:{icon:'/ax-logo.jpg'},
 robots:{index:process.env.AX_ALLOW_INDEXING==='true',follow:process.env.AX_ALLOW_INDEXING==='true'}
};
export const revalidate=60;
export const viewport = {width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#f7f7f4'};
export default async function RootLayout({children}) {
 const navigation=await getNavigation();
 const demo=!shopifyConfigured(), domain=process.env.SHOPIFY_STORE_DOMAIN;
 const accountUrl=!demo && /^[a-z0-9-]+\.myshopify\.com$/.test(domain || '') ? 'https://'+domain+'/account' : '';
 return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><NavigationProvider value={navigation}><CartProvider demo={demo}><StylistProvider>{demo && <div className="preview-banner">STORE PREVIEW · SAMPLE CATALOG · CHECKOUT UNAVAILABLE</div>}<Header/>{children}<Footer/><AXIsland accountUrl={accountUrl}/><CartDrawer/></StylistProvider></CartProvider></NavigationProvider></body></html>;
}
