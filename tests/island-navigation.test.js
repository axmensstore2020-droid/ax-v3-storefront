import test from 'node:test';
import assert from 'node:assert/strict';
import {islandSlotX,nearestIslandIndex} from '../lib/island-navigation.js';

test('island bead centers over each of five equal navigation slots',()=>{
 assert.equal(islandSlotX(400,0,72),4);
 assert.equal(islandSlotX(400,2,72),164);
 assert.equal(islandSlotX(400,4,72),324);
});

test('island drag snaps to the nearest navigation slot and clamps to edges',()=>{
 assert.equal(nearestIslandIndex(400,4,72),0);
 assert.equal(nearestIslandIndex(400,166,72),2);
 assert.equal(nearestIslandIndex(400,330,72),4);
 assert.equal(nearestIslandIndex(400,-200,72),0);
 assert.equal(nearestIslandIndex(400,900,72),4);
});
