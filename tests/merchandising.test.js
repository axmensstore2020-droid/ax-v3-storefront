import test from 'node:test';
import assert from 'node:assert/strict';
import {featuredProductRank} from '../lib/merchandising.js';

function p(type,title,tags=[]){return {type,title,tags};}

test('Featured merchandising follows AX category priority',()=>{
 const ordered=[
  p('Shirt','White Premium Linen Button-Down Shirt',['Linen']),
  p('Jackets','Red Motorsport-Inspired Racing Jacket'),
  p('Sweatpants','Black Baggy Brushed Cotton Sweatpants'),
  p('Hoodie','Aura Washed Oversized Hoodie'),
  p('Oversized T-Shirts','Brown Contrast Panel Statement Oversized T-Shirt'),
  p('Long Sleeve T-Shirts','Travis Scott Washed Grey Long Sleeve Tee'),
  p('Sleeveless T-Shirts','White Oversized Graphic Sleeveless Cropped Tee'),
  p('Jeans','White Wide Leg Baggy Jeans'),
  p('Trousers','Black Armani Bootcut'),
  p('Shirt','Oxford Shirt'),
  p('Chain / Accessories','Butterfly Pearl Layered Chain')
 ];
 const ranks=ordered.map(featuredProductRank);
 assert.deepEqual(ranks,[0,1,2,3,4,5,6,7,8,9,10]);
});
