// Use responsive Shopify CDN images without an extra client image library.
export function imageUrl(src,width) {
 if (!src) return '';
 try { const url=new URL(src); if(url.hostname === 'cdn.shopify.com') { url.searchParams.set('width',String(width)); return url.toString(); } } catch {}
 return src;
}
export default function ProductImage({src,alt,sizes='(max-width:700px) 50vw,25vw',eager=false}) {
 if(!src) return <div className="image-fallback">Image coming soon</div>;
 return <img src={imageUrl(src,720)} srcSet={src.startsWith('https://cdn.shopify.com/') ? [160,240,320,400,480,640,720,800,960,1200,1400].map(w => imageUrl(src,w)+' '+w+'w').join(', ') : undefined} sizes={sizes} alt={alt} width="800" height="1066" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" className="product-image"/>;
}
