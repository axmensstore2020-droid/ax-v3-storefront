import test from 'node:test';
import assert from 'node:assert/strict';
import {GUIDE_KINDS,measurementGuideKind,measurementInstruction} from '../lib/measurement-guide.js';
test('category guides distinguish sleeve lengths, garments and accessories',()=>{
 const cases={'Full Sleeve Linen Shirt':'shirt','Half Sleeve Shirt':'short_shirt','Long Sleeve Tee':'long_sleeve','Sleeveless Tee':'sleeveless','Polo T-shirt':'polo','Cotton Sweatshirt':'sweatshirt','Hoodie':'hoodie','Racing Jacket':'jacket','Formal Blazer':'blazer','Wool Coat':'coat','Cargo Pants':'cargo','Cotton Sweatpants':'joggers','Denim Jeans':'jeans','Chino Trousers':'bottom','Cotton Shorts':'shorts','Silver Chain':'chain','Leather Belt':'belt','Cap':'cap','Sunglasses':'eyewear','Watch':'watch'};
 for(const [title,kind] of Object.entries(cases))assert.equal(measurementGuideKind({title}),kind,title);
});
test('instructions track chart basis, not a universal doubling assumption',()=>{
 assert.equal(measurementInstruction('chest','circumference').factor,'×2');
 assert.equal(measurementInstruction('chest','flat').factor,'×1');
 assert.equal(measurementInstruction('chest','').factor,'Check basis');
 for(const f of ['shoulder','length','sleeve','front_rise','inseam','outseam','chain_length','head_circumference']) assert.equal(measurementInstruction(f,'circumference').factor,'×1');
 for(const g of Object.values(GUIDE_KINDS))for(const f of g.fields)assert.ok(!measurementInstruction(f,'circumference').text.includes('not been confirmed'),f);
 assert.equal(measurementInstruction('crotch','circumference').note,'Method needs confirmation');
});
