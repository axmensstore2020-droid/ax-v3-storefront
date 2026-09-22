import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const files=execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const sourceFiles=files.filter(file=>/\.(?:js|jsx|mjs|css)$/.test(file) && !file.startsWith('tests/') && file!=='scripts/security-invariants.mjs');
const uiFiles=sourceFiles.filter(file=>/^(?:app|components)\//.test(file));
const securityScanFiles=files.filter(file=>/\.(?:js|jsx|mjs|json|md|ya?ml|sql|css)$/.test(file) && !file.startsWith('tests/'));
const failures=[];
const read=file=>readFileSync(file,'utf8');
const fail=message=>failures.push(message);

for(const file of sourceFiles){
  const content=read(file);
  if(/NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|PRIVATE|SERVICE_ROLE|API_KEY)/.test(content)) {
    fail(`${file}: server secret/token appears to use NEXT_PUBLIC_`);
  }
  if(/^\s*['"]use client['"];?/m.test(content) && /process\.env\b/.test(content)) {
    fail(`${file}: client module must not read environment variables`);
  }
}

const secretPatterns=[
  ['OpenAI key',/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ['GitHub token',/\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['Shopify Admin token',/\bshpat_[A-Za-z0-9]{20,}\b/],
  ['Supabase secret',/\bsb_secret_[A-Za-z0-9_-]{24,}\b/],
  ['Razorpay live key',/\brzp_live_[A-Za-z0-9]{10,}\b/],
  ['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/]
];
for(const file of securityScanFiles){
  const content=read(file);
  for(const [label,pattern] of secretPatterns) if(pattern.test(content)) fail(`${file}: possible committed ${label}`);
}

for(const file of uiFiles){
  const content=read(file);
  for(const tag of content.match(/<img\b[\s\S]*?>/g)||[]) {
    if(!/\balt\s*=/.test(tag)) fail(`${file}: raw <img> is missing alt`);
  }
  for(const tag of content.match(/<a\b[\s\S]*?target=["']_blank["'][\s\S]*?>/g)||[]) {
    if(!/rel=["'][^"']*noopener[^"']*["']/.test(tag)) fail(`${file}: target=_blank is missing rel=noopener`);
  }
}

const nextConfig=read('next.config.js');
for(const header of ['Content-Security-Policy','X-Frame-Options','X-Content-Type-Options','Permissions-Policy','Referrer-Policy','Strict-Transport-Security']){
  if(!nextConfig.includes(header)) fail(`next.config.js: missing ${header}`);
}
if(!/poweredByHeader\s*:\s*false/.test(nextConfig)) fail('next.config.js: poweredByHeader must stay disabled');

const css=read('app/globals.css');
if(!css.includes(':focus-visible')) fail('app/globals.css: visible keyboard focus styles are required');
if(!css.includes('.skip-link')) fail('app/globals.css: skip-link styles are required');

const whatsapp=read('app/account/actions/whatsapp/route.js');
if(!whatsapp.includes("form.get('consent')!=='on'")) fail('WhatsApp opt-in must require explicit consent');
const env=read('.env.example');
if(!/AX_WHATSAPP_RETENTION_ENABLED=false/.test(env)) fail('WhatsApp retention must default to disabled');

const requestSecurity=read('lib/request-security.js');
for(const guard of ['reserveCartBurst','reserveShippingBurst','reserveRestockBurst','reserveCatalogBurst','MAX_BUCKETS']){
  if(!requestSecurity.includes(guard)) fail(`request-security.js: missing ${guard}`);
}

for(const file of ['lib/shopify.js','lib/delhivery.js','lib/stylist/openai.js','lib/restock-email.js','lib/whatsapp.js','lib/meta.js']){
  if(!read(file).includes('AbortSignal.timeout')) fail(`${file}: outbound provider calls need a hard timeout`);
}

const requestBody=read('lib/request-body.js');
for(const guard of ['readLimitedForm','assertAllowedKeys','assertAllowedFormKeys']){
  if(!requestBody.includes(guard)) fail(`request-body.js: missing ${guard}`);
}
for(const file of ['app/account/actions/profile/route.js','app/account/actions/address/route.js','app/account/actions/whatsapp/route.js']){
  const content=read(file);
  if(content.includes('request.formData()')) fail(`${file}: account forms must use bounded server parsing`);
  if(!content.includes('readLimitedForm')) fail(`${file}: bounded form parsing is required`);
}

const cartSession=read('lib/cart-session.js');
if(/secret\.length<32\)return true/.test(cartSession)) fail('cart-session.js: cart ownership must fail closed');

const stylistSecurity=read('lib/stylist/security.js');
for(const token of ['MAX_IMAGE_DIMENSION','MAX_IMAGE_PIXELS','imageDimensions']){
  if(!stylistSecurity.includes(token)) fail(`stylist/security.js: missing upload guard ${token}`);
}

if(!read('components/RichContent.js').includes('sanitizeRichContent')) fail('RichContent must pass HTML through the central sanitizer');
if(read('lib/partial-cod-server.js').includes('orderId:order.id')) fail('Partial COD response must not expose internal Shopify order IDs');

const migration=read('supabase/migrations/20260922_security_hardening.sql');
for(const token of ['enable row level security','deny_direct_client_access','revoke all','ax_server_budget_reserve']){
  if(!migration.includes(token)) fail(`security migration: missing ${token}`);
}

if(failures.length){
  console.error('Security invariant failures:');
  for(const item of failures) console.error('- '+item);
  process.exit(1);
}
console.log(`Security invariants OK (${sourceFiles.length} source files checked).`);
