import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

function report({score=.9,lcp=2200,cls=.04,tbt=120,bytes=1200000}={}){
 return {categories:{performance:{score}},audits:{
  'largest-contentful-paint':{numericValue:lcp},
  'cumulative-layout-shift':{numericValue:cls},
  'total-blocking-time':{numericValue:tbt},
  'total-byte-weight':{numericValue:bytes}
 }};
}

test('Lighthouse budget script passes a healthy report and fails a regression',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ax-lh-'));
 try{
  const good=join(dir,'good.json'),bad=join(dir,'bad.json');
  writeFileSync(good,JSON.stringify(report()));
  writeFileSync(bad,JSON.stringify(report({score:.62,lcp:4800,cls:.2,tbt:700,bytes:6000000})));
  const healthy=spawnSync(process.execPath,['scripts/lighthouse-budget.mjs','home',good],{encoding:'utf8'});
  assert.equal(healthy.status,0,healthy.stderr);
  const regression=spawnSync(process.execPath,['scripts/lighthouse-budget.mjs','home',bad],{encoding:'utf8'});
  assert.equal(regression.status,1);
  assert.match(regression.stderr,/Lighthouse budget failed/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
