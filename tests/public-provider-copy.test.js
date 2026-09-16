import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const publicStylistFiles=['components/StylistPanel.js','app/ax-stylist/page.js'];
const implementationNames=/\b(?:OpenAI|Supabase|Shopify|Hostinger)\b/i;

test('AX Stylist customer-facing copy keeps implementation providers in the privacy policy',async()=>{
 for(const file of publicStylistFiles){
  const source=await readFile(new URL(`../${file}`,import.meta.url),'utf8');
  assert.doesNotMatch(source,implementationNames,`${file} should use generic service-provider wording`);
 }
});
