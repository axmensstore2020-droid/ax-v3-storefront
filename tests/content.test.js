import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMenuUrl,normalizeMenu,hasUnresolvedTemplate} from '../lib/content-utils.js';
import {matchesCategory,matchesStyle,navigation} from '../lib/navigation.js';
import {homepageCampaignsQuery} from '../lib/content-queries.js';
test('Shopify links stay on AX; external links and unsafe schemes are not misrouted',()=>{
 assert.equal(normalizeMenuUrl('https://axunisexstore.myshopify.com/pages/contact',['axunisexstore.myshopify.com']),'/policies#refund-policy');
 assert.equal(normalizeMenuUrl('/pages/about-us'),'/about');
 assert.equal(normalizeMenuUrl('/collections/new-drop?sort=price#pieces'),'/collections/new-drop?sort=price#pieces');
 assert.equal(normalizeMenuUrl('https://another-store.example/collections/shirts'),'https://another-store.example/collections/shirts');
 for(const value of ['javascript:alert(1)','data:text/html,test','//example.com','/\\example.com','mailto:unrelated@example.com'])assert.equal(normalizeMenuUrl(value),null);
});
test('merchant menu order, additions, nested links and removals survive normalization',()=>{
 const menu={items:[{id:'new',title:'Our new edit',url:'/collections/custom-edit',items:[{id:'child',title:'Details',url:'/pages/edit-details'}]},{id:'shirts',title:'Everyday shirts',url:'/collections/shirts'}]};
 const items=normalizeMenu(menu,navigation);
 assert.deepEqual(items.map(i=>i.label),['Our new edit','Everyday shirts']);
 assert.equal(items[0].items[0].href,'/pages/edit-details');
 assert.deepEqual(normalizeMenu({items:[]},navigation),[]);
 assert.equal(normalizeMenu(null,navigation),navigation);
});
test('new styles and categories do not imply unverified merchandising',()=>{
 assert.equal(matchesStyle({title:'Designer shirt'},'designer-fits'),true);
 assert.equal(matchesStyle({title:'Printed shirt'},'designer-fits'),false);
 assert.equal(matchesStyle({title:'Classic polo',tags:['Old Money']},'old-money'),true);
 assert.equal(matchesCategory({title:'Linen trousers'},'shorts-jorts'),false);
 assert.equal(matchesCategory({title:'Linen trousers'},'summer-arc'),false);
 assert.equal(matchesCategory({title:'Linen trousers',tags:['Summer Arc']},'summer-arc'),true);
});
test('Shopify policy templates are recognized before rendering',()=>{
 assert.equal(hasUnresolvedTemplate('<p>{{ shop_name }}</p>'),true);
 assert.equal(hasUnresolvedTemplate('{% if selling_to_europe %}Terms{% endif %}'),true);
 assert.equal(hasUnresolvedTemplate('<p>Current policy.</p>'),false);
});

test('homepage campaign query carries Shopify-hosted video references',()=>{
 assert.match(homepageCampaignsQuery,/\.\.\. on Video/);
 assert.match(homepageCampaignsQuery,/sources \{ url mimeType format height width \}/);
 assert.match(homepageCampaignsQuery,/\.\.\. on GenericFile \{ url mimeType \}/);
});
