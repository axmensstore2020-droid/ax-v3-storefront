export function publicProductSummary(product){
  return {
    id:product.id,
    handle:product.handle,
    title:product.title,
    image:product.image,
    imageAlt:product.imageAlt || product.title,
    price:Number(product.price || 0),
    currency:product.currency || 'INR',
    compareAtPrice:Number(product.compareAtPrice || 0) || null,
    availableForSale:product.availableForSale!==false
  };
}
