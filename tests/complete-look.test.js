import test from 'node:test';
import assert from 'node:assert/strict';
import {completeLookState} from '../lib/complete-look.js';

const money=amount=>({amount:String(amount),currencyCode:'INR'});
const variant=(id,size,availableForSale=true,amount=900)=>({
 id,availableForSale,price:money(amount),selectedOptions:[{name:'Size',value:size}]
});
const main={
 id:'main',handle:'main-shirt',title:'Main Shirt',currency:'INR',price:1000,demo:false,
 options:[{name:'Size',values:['M','L']}],
 variants:[variant('main-m','M',true,1000),variant('main-l','L',true,1000)]
};
const pair={
 id:'pair',handle:'pair-pants',title:'Pair Pants',currency:'INR',price:900,demo:false,
 options:[{name:'Size',values:['S','M']}],
 variants:[variant('pair-s','S',true,900),variant('pair-m','M',false,900)]
};

test('Complete the Look requires the main product selection before building a bundle',()=>{
 const state=completeLookState({product:main,mainVariant:null,mainSelection:{},items:[pair],selections:{'pair-pants':{Size:'S'}}});
 assert.equal(state.missingMain?.name,'Size');
 assert.equal(state.ready,false);
 assert.deepEqual(state.linesToAdd,[]);
});

test('Complete the Look adds the selected main variant and only valid selected pair pieces',()=>{
 const state=completeLookState({
  product:main,mainVariant:main.variants[0],mainSelection:{Size:'M'},
  items:[pair],selections:{'pair-pants':{Size:'S'}}
 });
 assert.equal(state.ready,true);
 assert.deepEqual(state.linesToAdd.map(line=>line.merchandiseId),['main-m','pair-s']);
 assert.equal(state.bundleTotal,1900);
});

test('Complete the Look skips sold-out recommendations and never duplicates variants already in the bag',()=>{
 const soldOut=completeLookState({
  product:main,mainVariant:main.variants[0],mainSelection:{Size:'M'},
  items:[pair],selections:{'pair-pants':{Size:'M'}}
 });
 assert.equal(soldOut.ready,false);
 assert.deepEqual(soldOut.linesToAdd.map(line=>line.merchandiseId),['main-m']);

 const partialBag=completeLookState({
  product:main,mainVariant:main.variants[0],mainSelection:{Size:'M'},
  items:[pair],selections:{'pair-pants':{Size:'S'}},bagVariantIds:new Set(['main-m'])
 });
 assert.deepEqual(partialBag.pending.map(line=>line.merchandiseId),['pair-s']);
 assert.equal(partialBag.pendingTotal,900);
 assert.equal(partialBag.allInBag,false);
});
