// Read environment configuration only. Does not print secrets or call providers.
const required=['OPENAI_API_KEY','AX_STYLIST_SECRET','AX_SITE_ORIGIN','SUPABASE_URL','SHOPIFY_STORE_DOMAIN'];
let ok=true;
for(const key of required){const present=Boolean(process.env[key]);console.log(`${present?'OK':'MISSING'} ${key}`);ok&&=present;}
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log(`${supabaseKey?'OK':'MISSING'} SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY`);ok&&=Boolean(supabaseKey);
const storefront=Boolean(process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN || process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN);
console.log(`${storefront?'OK':'MISSING'} Shopify Storefront token`);ok&&=storefront;
if((process.env.AX_STYLIST_SECRET || '').length < 32){console.log('CHECK AX_STYLIST_SECRET must contain at least 32 random characters.');ok=false;}
try{const url=new URL(process.env.AX_SITE_ORIGIN);if(url.protocol!=='https:' || url.origin!==process.env.AX_SITE_ORIGIN)throw new Error();}catch{console.log('CHECK AX_SITE_ORIGIN must be an exact HTTPS origin without a path or trailing slash.');ok=false;}
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(process.env.SUPABASE_URL || '')){console.log('CHECK SUPABASE_URL format.');ok=false;}
console.log('Stylist switch: '+(process.env.AX_STYLIST_ENABLED==='true'?'enabled':'disabled'));
console.log('Photo switch: '+(process.env.AX_STYLIST_IMAGES_ENABLED==='true'?'enabled':'disabled'));
console.log('This check does not verify credentials, billing, SQL migration, scheduled purge or live model quality. Complete docs/AX-STYLIST-SETUP.md before launch.');
process.exitCode=ok?0:1;
