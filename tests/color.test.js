import test from 'node:test';
import assert from 'node:assert/strict';
import {swatchColor} from '../lib/color.js';

test('merchandising colour names map to stable swatch colours',()=>{
 assert.equal(swatchColor('Black'),'#151515');
 assert.equal(swatchColor('Ivory'),'#f1ead8');
 assert.equal(swatchColor('Washed Blue'),'#58739a');
 assert.equal(swatchColor('Cream'),'#ddd1b9');
 assert.equal(swatchColor('Lavender'),'#b9a7d2');
 assert.equal(swatchColor('Unknown shade'),'#b8b8b2');
});
