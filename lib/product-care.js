function text(value){return value==null?'':String(value).trim();}

export function productCareInstructions(product={}){
  const explicit=text(product.care);
  if(explicit) return explicit;

  const material=[product.fabric,product.type,product.title].map(text).join(' ').toLowerCase();

  if(/\b(?:chain|necklace|pendant|jewell?ery|accessor(?:y|ies)|stainless steel)\b/.test(material)){
    return 'Store dry and avoid prolonged contact with water, perfume and chemicals.';
  }
  if(/\b(?:leather|faux leather|synthetic leather|pu leather)\b/.test(material)){
    return 'Wipe clean with a soft damp cloth. Do not machine wash or bleach. Keep away from direct heat and allow to dry naturally.';
  }
  if(/\b(?:denim|jeans?)\b/.test(material)){
    return 'Machine wash cold, inside out, with similar colours. Do not bleach. Line dry in shade. Iron on reverse at low heat if needed.';
  }
  if(/\b(?:wool|woollen|knit|knitted|sweater)\b/.test(material)){
    return 'Gentle hand wash in cold water, or use a wool-safe cycle only if the garment label allows. Do not bleach. Dry flat in shade.';
  }
  if(/\b(?:cotton|french terry|fleece|jersey|polycotton|poly cotton|polyester)\b/.test(material)){
    return 'Machine wash cold, inside out, with similar colours. Do not bleach. Line dry in shade. Iron on reverse at low heat if needed.';
  }
  return 'Follow the garment care label. Wash with similar colours, avoid bleach, and use low heat unless the label states otherwise.';
}
