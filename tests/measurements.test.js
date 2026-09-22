import test from 'node:test';
import assert from 'node:assert/strict';
import {convertMeasurementValue,formatMeasurementDisplay,measurementCategory,measurementFieldsForProduct,measurementMarkers,normalizeMeasurementRows} from '../lib/measurements.js';

test('AX product categories use the agreed measurement schemas',()=>{
 assert.deepEqual(measurementFieldsForProduct({title:'Oversized T-Shirt'}),['chest','shoulder','length','sleeve']);
 assert.deepEqual(measurementFieldsForProduct({title:'Full Sleeve Cropped Tee'}),['chest','shoulder','length','sleeve']);
 assert.deepEqual(measurementFieldsForProduct({title:'Linen Shirt'}),['chest','shoulder','length','sleeve']);
 assert.deepEqual(measurementFieldsForProduct({title:'Baggy Jeans'}),['waist','hip','front_rise','thigh','inseam','outseam','leg_opening']);
 assert.deepEqual(measurementFieldsForProduct({title:'Cargo Pants'}),['waist','hip','front_rise','thigh','inseam','outseam','leg_opening']);
 assert.equal(measurementCategory({title:'Relaxed Shorts'}),'shorts');
 assert.equal(measurementCategory({title:'Raw Denim Jeans'}),'jeans');
 assert.equal(measurementCategory({title:'Long Sleeve T-shirt'}),'long_sleeve');
});

test('measurement markers follow A-D for tops and A-G for bottoms',()=>{
 assert.deepEqual(measurementMarkers({title:'Hoodie'}).map(item=>`${item.marker}:${item.field}`),['A:chest','B:shoulder','C:length','D:sleeve']);
 assert.deepEqual(measurementMarkers({title:'Straight Fit Jeans'}).map(item=>`${item.marker}:${item.field}`),['A:waist','B:hip','C:front_rise','D:thigh','E:inseam','F:outseam','G:leg_opening']);
});

test('flat legacy measurements can be standardized to full circumference cm',()=>{
 const result=normalizeMeasurementRows({M:{chest:20,shoulder:18,length:29,sleeve:9}},{unit:'inches',basis:'flat',category:'tee'});
 assert.equal(result.unit,'cm');
 assert.equal(result.basis,'circumference');
 assert.equal(result.rows.M.chest,101.6);
 assert.equal(result.rows.M.shoulder,45.72);
 assert.equal(result.rows.M.length,73.66);
});

test('canonical circumference cm stays unchanged and aliases normalize',()=>{
 const result=normalizeMeasurementRows({M:{'front length':74,'chest circumference':108,sleeve_length:62}},{unit:'cm',basis:'circumference',category:'shirt'});
 assert.deepEqual(result.rows.M,{length:74,chest:108,sleeve:62});
});

test('inch display is derived from cm and rounded to one decimal',()=>{
 assert.equal(convertMeasurementValue(104,'inches'),40.9);
 assert.equal(formatMeasurementDisplay(convertMeasurementValue([91,97],'inches')),'35.8–38.2');
});


test('shirt length is retained in the size chart schema',()=>{
 const result=normalizeMeasurementRows({S:{chest:94,shoulder:43,length:68},M:{chest:102,shoulder:44,length:70}},{unit:'cm',basis:'circumference',category:'shirt'});
 assert.equal(result.rows.S.length,68);
 assert.equal(result.rows.M.length,70);
});
