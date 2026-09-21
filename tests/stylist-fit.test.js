import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendFit} from '../lib/stylist/fit.js';
import {normalizeProfile,validateChat} from '../lib/stylist/validation.js';
import {readLimitedJson} from '../lib/request-body.js';
import {normalizeProductData} from '../lib/product-data.js';

export const shirt = () => ({handle:'linen-shirt',title:'Linen shirt',measurementUnit:'cm',measurementBasis:'circumference',
  sizeMeasurements:{S:{chest:104},M:{chest:110}},
  sizeGuide:{version:1,basis:'body_circumference',unit:'cm',sizes:{S:{chest:[90,96]},M:{chest:[97,102]}},ease_cm:{regular:[8,14],relaxed:[14,20]}},
  options:[{name:'Size',values:['S','M']},{name:'Color',values:['Cream','Black']}],
  variants:[{id:'s',availableForSale:true,selectedOptions:[{name:'Size',value:'S'},{name:'Color',value:'Cream'}]},{id:'m',availableForSale:true,selectedOptions:[{name:'Size',value:'M'},{name:'Color',value:'Cream'}]}]
});
test('approved ranges recommend S while selected M feels relaxed',()=>{
  const result = recommendFit(shirt(),{unit:'cm',chest:94},{Size:'M',Color:'Cream'});
  assert.equal(result.recommendedSize,'S');assert.equal(result.selectedFit,'relaxed');assert.equal(result.status,'recommended');
});
test('fit checks convert inches but do not infer units',()=>{
  assert.equal(recommendFit(shirt(),{unit:'inches',chest:37}).recommendedSize,'S');
  assert.equal(recommendFit(shirt(),{chest:94}).status,'needs_data');
});
test('out-of-range input does not choose the largest garment',()=>{
  assert.equal(recommendFit(shirt(),{unit:'cm',chest:110}).status,'outside_chart');
});
test('height alone, missing guide and conflicting charts produce no recommendation',()=>{
  assert.equal(recommendFit(shirt(),{unit:'cm',height:180}).status,'needs_data');
  assert.equal(recommendFit({...shirt(),sizeGuide:null},{unit:'cm',chest:94}).status,'needs_data');
  const p=shirt();p.sizeGuide.sizes.M.chest=[94,102];
  assert.equal(recommendFit(p,{unit:'cm',chest:95}).status,'between_sizes');
  p.sizeGuide.sizes.M.waist=[80,86];assert.equal(recommendFit(p,{unit:'cm',chest:95}).status,'needs_data');
});
test('availability respects colour and never recommends another size silently',()=>{
  const result=recommendFit(shirt(),{unit:'cm',chest:94},{Color:'Black',Size:'M'});
  assert.equal(result.status,'recommended_unavailable');assert.equal(result.recommendedSize,'S');
});
test('half-widths and unknown garment units never become ease recommendations',()=>{
  assert.equal(recommendFit({...shirt(),measurementBasis:'flat_width'},{unit:'cm',chest:94},{Size:'M'}).selectedFit,null);
  assert.equal(recommendFit({...shirt(),measurementUnit:''},{unit:'cm',chest:94},{Size:'M'}).selectedFit,null);
});
test('new merchant metafields are normalized without inferring defaults',()=>{
  const p=normalizeProductData({metafields:[{namespace:'ax',key:'size_guide',value:JSON.stringify(shirt().sizeGuide)},{namespace:'ax',key:'measurement_basis',value:'circumference'}]});
  assert.equal(p.sizeGuide.version,1);assert.equal(p.measurementBasis,'circumference');assert.equal(p.measurementUnit,'');
});
test('profiles validate dimensions, allowlists and units without saving unknown personal fields',()=>{
  assert.equal(normalizeProfile({unit:'cm',chest:'94',email:'private@example.test'}).email,undefined);
  assert.throws(()=>normalizeProfile({chest:400}));assert.throws(()=>normalizeProfile({chest:true}));assert.throws(()=>normalizeProfile({chest:'9e1'}));
  assert.throws(()=>normalizeProfile({unit:'feet'}));assert.throws(()=>normalizeProfile({fit:'guess'}));assert.throws(()=>normalizeProfile(null));
});
test('chat requires explicit consent, bounded text and plain product context',()=>{
  assert.throws(()=>validateChat({message:'hi'}));assert.throws(()=>validateChat({message:'x'.repeat(1201),consent:true}));
  assert.throws(()=>validateChat({message:'hi',consent:true,productHandle:'../../secret'}));
  assert.equal(validateChat({message:'hi',consent:true}).message,'hi');
});
test('request limits work even without a Content-Length header',async()=>{
  const request=new Request('https://ax.test/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'x'.repeat(1000)})});
  await assert.rejects(readLimitedJson(request,100),/too large/);
  await assert.rejects(readLimitedJson(new Request('https://ax.test/',{method:'POST',body:'{}'})),/JSON/);
});
