import {Fragment} from 'react';
import Link from 'next/link';
import ProductImage,{imageUrl} from '../components/ProductImage';
import Icon from '../components/Icon';
import {StylistButton} from '../components/StylistProvider';
import {getHomepageProducts} from '../lib/shopify';
import {getNavigation,getHomepageCampaigns} from '../lib/content';
import RecentlyViewed from '../components/RecentlyViewed';
import HeroVideo from '../components/HeroVideo';

export const revalidate=60;

function findImage(products, pattern, fallback='') {
 const match=products.find(product => product.image && pattern.test([product.title,...(product.tags || []),product.type,product.style].join(' ')));
 return match?.image || fallback;
}

function findTaggedImage(products, pattern, fallback) {
 const match=products.find(product => product.image && pattern.test((product.tags || []).join(' ')));
 return match || fallback;
}

function safeHref(value,fallback) {
 return typeof value==='string' && (/^\/(?!\/)/.test(value) || /^https:\/\//i.test(value)) ? value : fallback;
}

function themeClass(value,fallback='sage') {
 const theme=['sage','peach','blue','butter','lilac'].includes(String(value || '').toLowerCase()) ? String(value).toLowerCase() : fallback;
 return `editorial-pastel-${theme}`;
}

function campaign(campaigns,slot,fallback) {
 const entry=campaigns.find(item => item.slot===slot);
 if(!entry) return fallback;
 const customDesktopVideo=entry.desktopVideoSrc || '',customMobileVideo=entry.mobileVideoSrc || '';
 const usesCustomVideo=Boolean(customDesktopVideo || customMobileVideo);
 return {...fallback,...entry,
  imageSrc:entry.imageSrc || fallback.imageSrc,
  imageAlt:entry.imageAlt || fallback.imageAlt,
  mobileImageSrc:entry.mobileImageSrc || fallback.mobileImageSrc,
  desktopVideoSrc:usesCustomVideo ? (customDesktopVideo || customMobileVideo) : (fallback.desktopVideoSrc || ''),
  mobileVideoSrc:usesCustomVideo ? (customMobileVideo || customDesktopVideo) : (fallback.mobileVideoSrc || fallback.desktopVideoSrc || ''),
  usesCustomVideo,
  ctaLabel:entry.ctaLabel || fallback.ctaLabel,
  ctaLink:safeHref(entry.ctaLink,fallback.ctaLink),
  theme:themeClass(entry.theme,fallback.theme.replace('editorial-pastel-',''))
 };
}

function CampaignTitle({value,id,className='editorial',level='h2'}) {
 const Tag=level;
 return <Tag id={id} className={className}>{String(value || '').split('\n').map((line,index)=><Fragment key={`${line}-${index}`}>{index>0 && <br/>}{line}</Fragment>)}</Tag>;
}

function responsiveSourceSet(src,widths=[320,480,640,720,800]) {
 if(!src) return '';
 if(!src.startsWith('https://cdn.shopify.com/')) return src;
 return widths.map(width=>imageUrl(src,width)+' '+width+'w').join(', ');
}

function EditorialImage({src,mobileSrc,alt,sizes,eager=false}) {
 return <picture>{mobileSrc && <source media="(max-width:700px)" srcSet={responsiveSourceSet(mobileSrc)} sizes="100vw"/>}<ProductImage src={src} alt={alt} sizes={sizes} eager={eager}/></picture>;
}

function ArrowLink({href,children,className=''}) {
 const external=/^https:\/\//i.test(href || '');
 const props={className:`editorial-action ${className}`.trim(),...(external ? {target:'_blank',rel:'noreferrer'} : {})};
 return external ? <a href={href} {...props}><span>{children}</span><Icon name="arrow" size={18}/></a> : <Link href={href} {...props}><span>{children}</span><Icon name="arrow" size={18}/></Link>;
}

export default async function Home() {
 const [products,{styles},campaigns]=await Promise.all([getHomepageProducts(),getNavigation(),getHomepageCampaigns()]);
 const imagePool=products.filter(product => product.image);
 const hero=findTaggedImage(imagePool,/^(home[-_ ]?hero|editorial[-_ ]?hero)$/i,imagePool[0]);
 const second=findTaggedImage(imagePool,/^(home[-_ ]?(secondary|feature)|editorial[-_ ]?secondary)$/i,imagePool.find(product => product.id!==hero?.id) || hero);
 const linen=findImage(products,/linen/i,hero?.image || '');
 const jeans=findImage(products,/(jeans|denim)/i,second?.image || hero?.image || '');
 const jacket=findImage(products,/(jacket|outerwear|coat)/i,hero?.image || '');
 const shirt=findImage(products,/(shirt|flannel|polo)/i,second?.image || hero?.image || '');

 const heroCampaign=campaign(campaigns,'hero',{slot:'hero',eyebrow:'AX MEN’S STORE · COIMBATORE',title:'Inspired by the fear\nof being average.',description:'A considered wardrobe for every version of your day—easy layers, sharper moments and pieces that feel like you.',imageSrc:'',mobileImageSrc:'',imageAlt:'AX hero video',desktopVideoSrc:'',mobileVideoSrc:'',videoEnabled:true,usesCustomVideo:false,ctaLabel:'EXPLORE NEW ARRIVALS',ctaLink:'/products',theme:'editorial-pastel-sage'});
 const welcome=campaign(campaigns,'welcome',{slot:'welcome',eyebrow:'WELCOME TO AX',title:'A wardrobe with\nroom to be yourself.',description:'Discover the mood first. Then find the piece that belongs in your everyday.',theme:'editorial-pastel-sage'});
 const newArrivals=campaign(campaigns,'new-arrivals',{slot:'new-arrivals',eyebrow:'THE SHIRT EDIT',title:'New arrivals',description:'Fresh shapes and familiar favourites, curated for the days ahead.',imageSrc:shirt,imageAlt:'AX shirts editorial',ctaLabel:'SHOP NEW IN',ctaLink:'/products',theme:'editorial-pastel-sage'});
 const linenCampaign=campaign(campaigns,'linen',{slot:'linen',eyebrow:'LIGHT LAYERS',title:'Linen shirts',description:'',imageSrc:linen,imageAlt:'AX linen shirts editorial',ctaLabel:'SHOP LINEN',ctaLink:'/collections/linen',theme:'editorial-pastel-peach'});
 const jeansCampaign=campaign(campaigns,'jeans',{slot:'jeans',eyebrow:'THE EVERYDAY UNIFORM',title:'The jeans edit',description:'Relaxed, straight and ready for wherever the day takes you.',imageSrc:jeans,imageAlt:'AX denim editorial',ctaLabel:'VIEW MORE JEANS',ctaLink:'/collections/jeans',theme:'editorial-pastel-blue'});
 const winter=campaign(campaigns,'winter',{slot:'winter',eyebrow:'A NEW CHAPTER',title:'Winter Arc',description:'Texture, contrast and layers made for cooler evenings.',imageSrc:jacket,imageAlt:'AX winter arc editorial',ctaLabel:'EXPLORE THE WINTER ARC',ctaLink:'/collections/winter-arc',theme:'editorial-pastel-butter'});
 const special=campaign(campaigns,'special',{slot:'special',eyebrow:'FOR A LIMITED TIME',title:'Special prices',description:'Last pieces, considered prices. Find the ones worth keeping.',imageSrc:second?.image || '',imageAlt:'AX special prices editorial',ctaLabel:'SHOP SPECIAL PRICES',ctaLink:'/collections/special-prices',theme:'editorial-pastel-lilac'});
 const close=campaign(campaigns,'close',{slot:'close',eyebrow:'NEED A LITTLE DIRECTION?',title:'Let AX Stylist\nshow you around.',description:'',ctaLabel:'EXPLORE WITH AX',ctaLink:'',theme:'editorial-pastel-sage'});

 return <main id="main-content" className="editorial-home">
  <section className={`editorial-hero ${heroCampaign.theme}`} aria-labelledby="editorial-hero-title">
   <Link className="editorial-hero-visual" href={heroCampaign.ctaLink} aria-label={heroCampaign.ctaLabel}>
    {heroCampaign.imageSrc && <EditorialImage src={heroCampaign.imageSrc} mobileSrc={heroCampaign.mobileImageSrc} alt={heroCampaign.imageAlt || 'AX editorial campaign'} sizes="(max-width:700px) 100vw, 62vw" eager/>}
    {heroCampaign.videoEnabled && (heroCampaign.mobileVideoSrc || heroCampaign.desktopVideoSrc) && <HeroVideo
     mobileSrc={heroCampaign.mobileVideoSrc || heroCampaign.desktopVideoSrc}
     desktopSrc={heroCampaign.desktopVideoSrc || heroCampaign.mobileVideoSrc}
    />}
    <span className="editorial-image-caption">{heroCampaign.ctaLabel} <Icon name="arrow" size={17}/></span>
   </Link>
   <div className="editorial-hero-copy">
    <div><p className="eyebrow">{heroCampaign.eyebrow}</p><CampaignTitle value={heroCampaign.title} id="editorial-hero-title" level="h1"/><p className="editorial-lede">{heroCampaign.description}</p></div>
    <div className="editorial-hero-footer"><ArrowLink href={heroCampaign.ctaLink}>{heroCampaign.ctaLabel}</ArrowLink><span className="editorial-index">01 / AX EDITORIAL</span></div>
   </div>
  </section>

  <section className={`editorial-welcome ${welcome.theme}`} aria-labelledby="welcome-title"><p className="eyebrow">{welcome.eyebrow}</p><CampaignTitle value={welcome.title} id="welcome-title"/><p>{welcome.description}</p></section>

  <section className="editorial-campaigns" aria-label="AX campaigns">
   <article className={`editorial-campaign editorial-campaign-large ${newArrivals.theme}`}><div className="editorial-campaign-image"><EditorialImage src={newArrivals.imageSrc} mobileSrc={newArrivals.mobileImageSrc} alt={newArrivals.imageAlt} sizes="(max-width:700px) 100vw, 58vw"/></div><div className="editorial-campaign-copy"><p className="eyebrow">{newArrivals.eyebrow}</p><CampaignTitle value={newArrivals.title}/>{newArrivals.description && <p>{newArrivals.description}</p>}<ArrowLink href={newArrivals.ctaLink}>{newArrivals.ctaLabel}</ArrowLink></div></article>
   <article className={`editorial-campaign editorial-campaign-small ${linenCampaign.theme}`}><div className="editorial-campaign-image"><EditorialImage src={linenCampaign.imageSrc} mobileSrc={linenCampaign.mobileImageSrc} alt={linenCampaign.imageAlt} sizes="(max-width:700px) 100vw, 38vw"/></div><div className="editorial-campaign-copy"><p className="eyebrow">{linenCampaign.eyebrow}</p><CampaignTitle value={linenCampaign.title}/>{linenCampaign.description && <p>{linenCampaign.description}</p>}<ArrowLink href={linenCampaign.ctaLink}>{linenCampaign.ctaLabel}</ArrowLink></div></article>
  </section>

  <section className={`editorial-split-campaign ${jeansCampaign.theme}`} aria-labelledby="jeans-title"><div className="editorial-split-copy"><p className="eyebrow">{jeansCampaign.eyebrow}</p><CampaignTitle value={jeansCampaign.title} id="jeans-title"/>{jeansCampaign.description && <p>{jeansCampaign.description}</p>}<ArrowLink href={jeansCampaign.ctaLink}>{jeansCampaign.ctaLabel}</ArrowLink></div><div className="editorial-split-image"><EditorialImage src={jeansCampaign.imageSrc} mobileSrc={jeansCampaign.mobileImageSrc} alt={jeansCampaign.imageAlt} sizes="(max-width:700px) 100vw, 55vw"/></div></section>
  <section className={`editorial-feature ${winter.theme}`} aria-labelledby="winter-title"><div className="editorial-feature-image"><EditorialImage src={winter.imageSrc} mobileSrc={winter.mobileImageSrc} alt={winter.imageAlt} sizes="(max-width:700px) 100vw, 55vw"/></div><div className="editorial-feature-copy"><p className="eyebrow">{winter.eyebrow}</p><CampaignTitle value={winter.title} id="winter-title"/>{winter.description && <p>{winter.description}</p>}<ArrowLink href={winter.ctaLink}>{winter.ctaLabel}</ArrowLink></div></section>
  <section className={`editorial-special ${special.theme}`} aria-labelledby="special-title"><div className="editorial-special-copy"><p className="eyebrow">{special.eyebrow}</p><CampaignTitle value={special.title} id="special-title"/>{special.description && <p>{special.description}</p>}<ArrowLink href={special.ctaLink}>{special.ctaLabel}</ArrowLink></div><div className="editorial-special-image"><EditorialImage src={special.imageSrc} mobileSrc={special.mobileImageSrc} alt={special.imageAlt} sizes="(max-width:700px) 100vw, 44vw"/></div></section>

  <RecentlyViewed/>

  <section className="editorial-style-index" aria-labelledby="style-title"><div><p className="eyebrow">FIND YOUR WAY IN</p><CampaignTitle value="Explore by mood." id="style-title"/><p>Old money, Korean fits, streetwear and everything in between.</p></div><nav className="editorial-style-links" aria-label="Style collections">{styles.map((style,index) => <Link key={style.key} href={style.href}><span><small>{String(index+1).padStart(2,'0')}</small>{style.label}</span><Icon name="arrow" size={18}/></Link>)}</nav></section>

  <section className={`editorial-close ${close.theme}`} aria-labelledby="close-title"><p className="eyebrow">{close.eyebrow}</p><CampaignTitle value={close.title} id="close-title"/>{close.ctaLink ? <ArrowLink href={close.ctaLink}>{close.ctaLabel}</ArrowLink> : <StylistButton className="editorial-action">{close.ctaLabel} <Icon name="arrow" size={18}/></StylistButton>}</section>
 </main>;
}
