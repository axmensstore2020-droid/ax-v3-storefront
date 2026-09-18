import ProductImage from './ProductImage';

export default function ProductProof({product}){
 const rating=Number(product.reviewRating||0),count=Number(product.reviewCount||0),images=Array.isArray(product.ugcImages)?product.ugcImages:[];
 if(!(rating>=1&&rating<=5&&count>0)&&!images.length)return null;
 return <section className="product-proof" aria-label="Customer proof">
  {rating>=1&&rating<=5&&count>0&&<div className="product-proof-summary"><strong>{rating.toFixed(1)} / 5</strong><span>{count} verified {count===1?'review':'reviews'}</span></div>}
  {images.length>0&&<><p className="eyebrow">WORN BY THE AX COMMUNITY</p><div className="product-proof-images">{images.map((src,index)=><span key={src}><ProductImage src={src} alt={`AX customer styling ${product.title}, look ${index+1}`} sizes="120px" fallbackWidth={320}/></span>)}</div></>}
 </section>;
}
