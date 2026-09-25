import fs from 'node:fs';

const [label='page',file]=process.argv.slice(2);
if(!file) throw new Error('Usage: node scripts/lighthouse-budget.mjs <label> <report.json>');

const report=JSON.parse(fs.readFileSync(file,'utf8'));
const audits=report.audits || {};
const score=Math.round(Number(report.categories?.performance?.score || 0)*100);
const lcp=Number(audits['largest-contentful-paint']?.numericValue || Infinity);
const cls=Number(audits['cumulative-layout-shift']?.numericValue || Infinity);
const tbt=Number(audits['total-blocking-time']?.numericValue || Infinity);
const bytes=Number(audits['total-byte-weight']?.numericValue || Infinity);

const limits={
  minScore:Number(process.env.AX_LH_MIN_PERF || 80),
  maxLcp:Number(process.env.AX_LH_MAX_LCP_MS || 3500),
  maxCls:Number(process.env.AX_LH_MAX_CLS || 0.1),
  maxTbt:Number(process.env.AX_LH_MAX_TBT_MS || 300),
  maxBytes:Number(process.env.AX_LH_MAX_BYTES || 4500000)
};

const result={page:label,performance:score,lcpMs:Math.round(lcp),cls:Number(cls.toFixed(4)),tbtMs:Math.round(tbt),transferBytes:Math.round(bytes),limits};
console.log('AX_LIGHTHOUSE_BUDGET '+JSON.stringify(result));

const failures=[];
if(score<limits.minScore) failures.push(`performance ${score} < ${limits.minScore}`);
if(lcp>limits.maxLcp) failures.push(`LCP ${Math.round(lcp)}ms > ${limits.maxLcp}ms`);
if(cls>limits.maxCls) failures.push(`CLS ${cls.toFixed(4)} > ${limits.maxCls}`);
if(tbt>limits.maxTbt) failures.push(`TBT ${Math.round(tbt)}ms > ${limits.maxTbt}ms`);
if(bytes>limits.maxBytes) failures.push(`transfer ${Math.round(bytes)} bytes > ${limits.maxBytes}`);

if(failures.length){
  console.error(`Lighthouse budget failed for ${label}: ${failures.join('; ')}`);
  process.exit(1);
}
