// Use responsive Shopify CDN images without an extra client image library.
const DEFAULT_WIDTHS=[160,240,320,400,480,640,720,800,960,1200,1400];

export function imageUrl(src,width) {
 if (!src) return '';
 try { const url=new URL(src); if(url.hostname === 'cdn.shopify.com') { url.searchParams.set('width',String(width)); return url.toString(); } } catch {}
 return src;
}

export function imageSrcSet(src,widths=DEFAULT_WIDTHS) {
 if(!src || !src.startsWith('https://cdn.shopify.com/')) return undefined;
 return [...new Set(widths)].sort((a,b)=>a-b).map(width=>imageUrl(src,width)+' '+width+'w').join(', ');
}

export default function ProductImage({src,alt,sizes='(max-width:700px) 50vw,25vw',eager=false,widths=DEFAULT_WIDTHS,fallbackWidth=720}) {
 if(!src) return <div className="image-fallback">Image coming soon</div>;
 return <img src={imageUrl(src,fallbackWidth)} srcSet={imageSrcSet(src,widths)} sizes={sizes} alt={alt} width="800" height="1066" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" className="product-image"/>;
}
