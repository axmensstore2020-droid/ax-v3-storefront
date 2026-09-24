import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('root layout no longer ships PDP, Playroom, or homepage intro assets globally',()=>{
 const layout=read('app/layout.js');
 assert.doesNotMatch(layout,/pdp-cleanup\.css/);
 assert.doesNotMatch(layout,/playroom\.css/);
 assert.doesNotMatch(layout,/OpeningIntro/);
 assert.match(read('app/products/[handle]/page.js'),/pdp-cleanup\.css/);
 assert.match(read('components/AXPlayroom.js'),/playroom\.css/);
 assert.match(read('app/page.js'),/OpeningIntro/);
});

test('motion enhancer uses explicit scans instead of observing every body mutation',()=>{
 const enhancer=read('components/MotionEnhancer.js');
 assert.doesNotMatch(enhancer,/MutationObserver/);
 assert.doesNotMatch(enhancer,/observe\(document\.body/);
 assert.match(enhancer,/ax:motion-scan/);
 for(const path of ['components/Dialog.js','components/ProductGridClient.js','components/ShippingEstimator.js','components/CartDrawer.js']){
  assert.match(read(path),/requestMotionScan/);
 }
});

test('persistent will-change layers are removed from island bead and carousel track',()=>{
 const css=read('app/refinements.css');
 assert.doesNotMatch(css,/\.ax-island-bead\{[^}]*will-change/s);
 assert.doesNotMatch(css,/\.styled-with-ax-track\{[^}]*will-change/s);
 const island=read('components/AXIsland.js');
 const carousel=read('components/StyledWithAxCarousel.js');
 assert.match(island,/bead\.style\.willChange='transform'/);
 assert.match(island,/bead\.style\.willChange=''/);
 assert.match(carousel,/track\.style\.willChange='transform'/);
 assert.match(carousel,/track\.style\.willChange=''/);
});

test('reduced-motion carousel does not start a continuous animation frame loop',()=>{
 const carousel=read('components/StyledWithAxCarousel.js');
 assert.match(carousel,/document\.hidden \|\| reducedMotionRef\.current/);
 assert.match(carousel,/renderReducedTarget/);
});
