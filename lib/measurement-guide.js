import {canonicalMeasurementBasis,CIRCUMFERENCE_FIELDS,measurementCategory,measurementLabel} from './measurements.js';

export const GUIDE_KINDS = {
 tee:{name:'T-shirt',fields:['chest','shoulder','length','sleeve']},
 sleeveless:{name:'Sleeveless tee',fields:['chest','shoulder','length']},
 long_sleeve:{name:'Long-sleeve tee',fields:['chest','shoulder','length','sleeve']},
 polo:{name:'Polo',fields:['chest','shoulder','length','sleeve']},
 shirt:{name:'Shirt',fields:['chest','shoulder','length','sleeve']},
 short_shirt:{name:'Short-sleeve shirt',fields:['chest','shoulder','length','sleeve']},
 hoodie:{name:'Hoodie',fields:['chest','shoulder','length','sleeve']},
 sweatshirt:{name:'Sweatshirt',fields:['chest','shoulder','length','sleeve']},
 jacket:{name:'Jacket',fields:['chest','shoulder','length','sleeve']},
 blazer:{name:'Blazer',fields:['chest','shoulder','length','sleeve']},
 coat:{name:'Coat',fields:['chest','shoulder','length','sleeve']},
 jeans:{name:'Jeans',fields:['waist','hip','front_rise','thigh','knee','inseam','outseam','leg_opening']},
 bottom:{name:'Trousers',fields:['waist','hip','front_rise','thigh','knee','inseam','outseam','leg_opening']},
 cargo:{name:'Cargo trousers',fields:['waist','hip','front_rise','thigh','knee','inseam','outseam','leg_opening']},
 joggers:{name:'Sweatpants / joggers',fields:['waist','hip','front_rise','thigh','knee','inseam','outseam','leg_opening']},
 shorts:{name:'Shorts',fields:['waist','hip','front_rise','thigh','inseam','outseam','leg_opening']},
 chain:{name:'Chain',fields:['chain_length']},belt:{name:'Belt',fields:['belt_length','width']},
 cap:{name:'Cap',fields:['head_circumference']},eyewear:{name:'Eyewear',fields:['lens_width','bridge','temple_length']},
 watch:{name:'Watch',fields:['case_width','strap_length']}
};
export function measurementGuideKind(product={}) {
 const text=[product.type,product.title,...(Array.isArray(product.tags)?product.tags:[])].join(' ').toLowerCase();
 for(const [pattern,kind] of [[/\b(necklace|chain)s?\b/,'chain'],[/\bbelts?\b/,'belt'],[/\b(caps?|hats?)\b/,'cap'],[/\b(sunglasses|eyewear|glasses)\b/,'eyewear'],[/\bwatch(?:es)?\b/,'watch'],[/\bshorts?\b/,'shorts'],[/\bcargos?\b/,'cargo'],[/\b(sweatpants?|joggers?)\b/,'joggers'],[/\b(jeans?|denim)\b/,'jeans'],[/\b(trousers?|pants?|chinos?)\b/,'bottom'],[/\bhoodies?\b/,'hoodie'],[/\bsweatshirts?\b/,'sweatshirt'],[/\bblazers?\b/,'blazer'],[/\bcoats?\b/,'coat'],[/\bjackets?\b/,'jacket'],[/\b(sleeveless|tank)\b/,'sleeveless'],[/\bpolo\b/,'polo']]) if(pattern.test(text))return kind;
 if(/\bshirts?\b/.test(text)&&! /\bt[ -]?shirts?\b/.test(text))return /short.?sleeve|half.?sleeve|half.?hand/.test(text)?'short_shirt':'shirt';
 return measurementCategory(product);
}
const DIRECTIONS={
 chest:'Measure straight across from underarm to underarm.',shoulder:'Measure across the back, from one shoulder seam to the other. Do not include sleeves.',
 length:'Measure from the highest shoulder point beside the neck to the hem. Exclude the collar or hood.',sleeve:'Follow the sleeve from the shoulder seam to the cuff. For a dropped shoulder, start at the actual seam.',
 waist:'Fasten the waistband and measure across it without stretching. Keep elastic relaxed.',hip:'Measure across the widest part of the seat, below the waistband.',
 front_rise:'Follow the front centre seam from the crotch seam intersection to the top of the waistband.',back_rise:'Turn the garment over. Follow the back centre seam from the crotch intersection to the top of the waistband.',
 thigh:'Measure across one leg just below the crotch, perpendicular to the leg.',knee:'Measure across one leg at knee level. Use the same distance below the crotch as the product chart.',
 inseam:'Follow the inside leg seam from the crotch intersection to the hem.',outseam:'Follow the outside seam from the top of the waistband to the hem.',leg_opening:'Measure across the hem of one leg, laid flat.',
 crotch:'This legacy field needs clarification: a full crotch seam and a front rise are different measurements. Ask AX before comparing.',
 chain_length:'Open the clasp and measure the chain end to end. Exclude a pendant; record it separately.',belt_length:'Measure from the buckle pin to the middle fastening hole. Exclude the buckle itself.',width:'Measure straight across the item at its widest point.',
 head_circumference:'Run a flexible tape around the inside opening of the cap. Record the adjustment range if applicable.',
 lens_width:'Measure one lens horizontally at its widest point.',bridge:'Measure the shortest distance between the two lenses.',temple_length:'Follow the arm from the hinge to its tip, including the bend.',case_width:'Measure across the watch case, excluding the crown.',strap_length:'Measure both strap sections end to end, excluding the watch case and buckle.'
};
export function measurementInstruction(field,basis) {
 const circular=CIRCUMFERENCE_FIELDS.includes(field);
 const known=canonicalMeasurementBasis(basis);
 const factor=(!DIRECTIONS[field]||field==='crotch')?'Check method':circular?(known==='circumference'?'×2':known==='flat'?'×1':'Check basis'):'×1';
 return {label:measurementLabel(field),factor,text:DIRECTIONS[field]||'The measuring method for this field has not been confirmed. Ask AX before comparing.',
 note:!DIRECTIONS[field]||field==='crotch'?'Method needs confirmation':circular?(known==='circumference'?'Double your flat width to compare with this chart. The chart value is already doubled.':known==='flat'?'Use the flat width as measured. Do not double it.':'The chart does not confirm flat width or circumference. Do not double or halve the value yet.'):'Use the measured distance once. Do not double it.'};
}
