import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('AX auth success overlay avoids an extra navigation/page-view hop',async()=>{
  const [overlay,authorize,layout]=await Promise.all([
    readFile(new URL('../components/AuthSuccessOverlay.js',import.meta.url),'utf8'),
    readFile(new URL('../app/account/authorize/route.js',import.meta.url),'utf8'),
    readFile(new URL('../app/layout.js',import.meta.url),'utf8')
  ]);
  assert.match(authorize,/authCompleteUrl\(config,oauth\.returnTo\)/);
  assert.match(overlay,/history\.replaceState/);
  assert.doesNotMatch(overlay,/router\.(push|replace)/);
  assert.match(overlay,/prefers-reduced-motion/);
  assert.match(layout,/AuthSuccessOverlay/);
});
