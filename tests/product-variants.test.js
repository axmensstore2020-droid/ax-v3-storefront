import test from 'node:test';
import assert from 'node:assert/strict';
import {productOptions,initialSelection,selectionImage,optionAvailable,cartLineDetails} from '../lib/product-variants.js';
import {findVariant} from '../lib/commerce.js';
import {recommendationCard} from '../lib/stylist/recommendations.js';
const image=color=>({url:'https://cdn.shopify.com/'+color.toLowerCase()+'.jpg',altText:color});
const variant=(id,color,size,availableForSale=true)=>({id:'gid://shopify/ProductVariant/'+id,title:color+' / '+size,availableForSale,selectedOptions:[{name:'Color',value:color},{name:'Size',value:size}],image:image(color),price:{amount:'1200',currencyCode:'INR'}});
const product={handle:'shirt',title:'Shirt',availableForSale:true,image:image('black'),images:[image('black'),image('beige')],variants:[variant(1,'Black','S'),variant(2,'Black','M'),variant(3,'Beige','S'),variant(4,'Beige','M',false)]};
test('size options come from Shopify, and a size must be explicitly selected',()=>{
  assert.deepEqual(productOptions(product).find(o=>o.name==='Size').values,['S','M']);
  const initial=initialSelection(product);assert.deepEqual(initial,{Color:'Black'});assert.equal(findVariant(product.variants,initial),undefined);
  const selected={...initial,Size:'M'};assert.equal(findVariant(product.variants,selected).id,'gid://shopify/ProductVariant/2');
  const onlyColor={variants:[{...product.variants[0],selectedOptions:[{name:'Color',value:'Black'}]}]};assert.ok(!productOptions(onlyColor).some(o=>o.name==='Size'));
});
test('color image changes before size selection, and unavailable pairs stay unavailable',()=>{
  assert.equal(selectionImage(product,{Color:'Beige'}).url,image('beige').url);
  assert.equal(optionAvailable(product.variants,{Color:'Black',Size:'M'},'Color','Beige'),true);
  assert.equal(optionAvailable(product.variants,{Color:'Beige'},'Size','M'),false);
  assert.equal(findVariant(product.variants,{Color:'Beige',Size:'M'}).availableForSale,false);
});
test('exact variant deep links and bag images/options survive color selection',()=>{
  assert.deepEqual(initialSelection(product,'3'),{Color:'Beige',Size:'S'});
  const v=product.variants[2],line=cartLineDetails({id:'line',quantity:1,cost:{totalAmount:{amount:'1200',currencyCode:'INR'}},merchandise:{...v,product:{...product,featuredImage:image('black')}}});
  assert.equal(line.image,image('beige').url);assert.match(line.href,/variant=3/);assert.match(line.variant,/Color: Beige/);assert.match(line.variant,/Size: S/);
});
test('AI cards preserve exact color and require size confirmation; wrong variants are dropped',()=>{
  const p={...product,options:productOptions(product),image:product.image.url,variants:product.variants.map(v=>({...v,image:v.image.url}))};
  const choice={handle:'shirt',variantId:p.variants[2].id,selectedOptions:[{name:'Color',value:'Beige'}]};
  const card=recommendationCard(p,choice);assert.equal(card.variantId,choice.variantId);assert.equal(card.image,image('beige').url);assert.match(card.href,/variant=3&chooseSize=1/);
  assert.deepEqual(initialSelection(product,'3',true),{Color:'Beige'});
  const inherited=recommendationCard(p,{handle:'shirt',variantId:null,selectedOptions:[]},{productHandle:'shirt',selectedOptions:{Color:'Beige',Size:'S'}});
  assert.equal(inherited.variantId,p.variants[2].id);assert.equal(inherited.image,image('beige').url);assert.equal(inherited.requiresSize,false);
  assert.equal(recommendationCard(p,{...choice,variantId:'gid://shopify/ProductVariant/999'}),null);
  assert.equal(recommendationCard(p,{...choice,selectedOptions:[{name:'Color',value:'Red'}]}),null);
  assert.equal(recommendationCard(p,{...choice,variantId:p.variants[3].id}),null);
  assert.equal(recommendationCard(p,choice,{productHandle:'shirt',selectedOptions:{Color:'Black'}}),null);
});
