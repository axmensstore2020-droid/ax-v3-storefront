import {Fragment} from 'react';
import Link from 'next/link';
import ProductImage,{imageUrl} from '../components/ProductImage';
import Icon from '../components/Icon';
import {getHomepageProducts} from '../lib/shopify';
import {getHomepageCampaigns} from '../lib/content';
import HeroVideo from '../components/HeroVideo';
import {styledWithAx} from '../lib/styled-with-ax';
import StyledWithAxCarousel from '../components/StyledWithAxCarousel';
import OpeningIntro from '../components/OpeningIntro';

export const revalidate=60;

function findTaggedImage(products, pattern, fallback) {
 const match=products.find(product => product.image && pattern.test((product.tags || []).join(' ')));
 return match || fallback;
}


function safeHref(value,fallback) {
 return typeof value==='string' && (/^\/(?!\/)/.test(value) || /^https:\/\//i.test(value)) ? value : fallback;
}

function themeClass(value,fallback='sage') {
 const theme=['sage','peach','blue','butter','lilac','red'].includes(String(value || '').toLowerCase()) ? String(value).toLowerCase() : fallback;
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
 const [products,campaigns]=await Promise.all([getHomepageProducts(),getHomepageCampaigns()]);
 const imagePool=products.filter(product => product.image);
 const hero=findTaggedImage(imagePool,/^(home[-_ ]?hero|editorial[-_ ]?hero)$/i,imagePool[0]);

 const heroCampaign=campaign(campaigns,'hero',{slot:'hero',eyebrow:'AX MEN’S STORE · COIMBATORE',title:'Inspired by the fear\nof being average.',description:'A considered wardrobe for every version of your day—easy layers, sharper moments and pieces that feel like you.',imageSrc:'',mobileImageSrc:'',imageAlt:'AX hero video',desktopVideoSrc:'',mobileVideoSrc:'',videoEnabled:true,usesCustomVideo:false,ctaLabel:'EXPLORE NEW ARRIVALS',ctaLink:'/products',theme:'editorial-pastel-sage'});
 const bestSellers=campaign(campaigns,'linen',{slot:'linen',eyebrow:'',title:'Best sellers',description:'The AX pieces in the spotlight right now.',imageSrc:'https://cdn.shopify.com/s/files/1/0859/5216/8176/files/E5966B24-A17E-4BFF-B98F-50CD9AE9BFDA.png?v=1789567270',imageAlt:'White Premium Linen Button-Down Shirt',ctaLabel:'SHOP BEST SELLERS',ctaLink:'/collections/best-sellers',theme:'editorial-pastel-sage'});
 const special=campaign(campaigns,'special',{slot:'special',eyebrow:'LIMITED TIME',title:'Special prices',description:'Selected pieces at reduced prices.',imageSrc:'',imageAlt:'',ctaLabel:'SHOP SPECIAL PRICES',ctaLink:'/collections/special-prices',theme:'editorial-pastel-red'});
 const heroPoster=heroCampaign.imageSrc || hero?.image || '';
 const heroMobilePoster=heroCampaign.mobileImageSrc || heroPoster;

 return <><OpeningIntro/><main id="main-content" className="editorial-home">
  <section className={`editorial-hero ${heroCampaign.theme}`} aria-labelledby="editorial-hero-title">
   <Link className="editorial-hero-visual" href={heroCampaign.ctaLink} aria-label={heroCampaign.ctaLabel}>
    {heroPoster && <EditorialImage src={heroPoster} mobileSrc={heroMobilePoster} alt={heroCampaign.imageAlt || hero?.imageAlt || 'AX editorial campaign'} sizes="(max-width:700px) 100vw, 62vw" eager/>}
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

  <section className={`editorial-bestsellers ${bestSellers.theme}`} aria-labelledby="best-sellers-title">
   <div className="editorial-bestsellers-image"><EditorialImage src={bestSellers.imageSrc} mobileSrc={bestSellers.mobileImageSrc} alt={bestSellers.imageAlt} sizes="(max-width:700px) 100vw, 58vw"/></div>
   <div className="editorial-bestsellers-copy"><p className="eyebrow">{bestSellers.eyebrow}</p><CampaignTitle value={bestSellers.title} id="best-sellers-title"/>{bestSellers.description && <p>{bestSellers.description}</p>}<ArrowLink href={bestSellers.ctaLink}>{bestSellers.ctaLabel}</ArrowLink></div>
  </section>

  <section className={`editorial-special-offer ${special.theme}`} aria-labelledby="special-title">
   <p className="eyebrow">{special.eyebrow}</p>
   <CampaignTitle value={special.title} id="special-title"/>
   {special.description && <p>{special.description}</p>}
   <ArrowLink href={special.ctaLink}>{special.ctaLabel}</ArrowLink>
  </section>

  {styledWithAx.length>0 && <section className="styled-with-ax" aria-labelledby="styled-with-ax-title">
   <div className="styled-with-ax-head"><div><p className="eyebrow">COMMUNITY / EDITORIAL</p><CampaignTitle value="Styled with AX" id="styled-with-ax-title"/></div><p>Selected AX collaborations, campaign moments and community styling.</p></div>
   <StyledWithAxCarousel items={styledWithAx}/>
   <div className="styled-with-ax-socials" aria-label="AX social accounts">
    <a href="https://www.instagram.com/axmensstore/" target="_blank" rel="noreferrer" aria-label="AX on Instagram" title="Instagram">
     <img src="https://cdn.simpleicons.org/instagram/171717" alt="" aria-hidden="true" loading="lazy"/>
    </a>
    <a href="https://www.threads.net/@axmensstore" target="_blank" rel="noreferrer" aria-label="AX on Threads" title="Threads">
     <img src="https://cdn.simpleicons.org/threads/171717" alt="" aria-hidden="true" loading="lazy"/>
    </a>
    <a href="https://www.facebook.com/axmensstore" target="_blank" rel="noreferrer" aria-label="AX on Facebook" title="Facebook">
     <img src="https://cdn.simpleicons.org/facebook/171717" alt="" aria-hidden="true" loading="lazy"/>
    </a>
   </div>
  </section>}
 </main></>;
}
