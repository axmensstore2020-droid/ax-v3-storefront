import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PDP='/products/men-s-premium-long-sleeve-polo-t-shirt-smart-casual-wear';

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    sessionStorage.setItem('ax_opening_intro_v3','1');
    localStorage.removeItem('ax_demo_bag_v2');
  });
  await page.route('https://cdn.shopify.com/**',route=>route.abort());
});

async function expectNoHorizontalPageOverflow(page){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
}

async function expectCriticalA11y(page){
  const results=await new AxeBuilder({page})
    .withTags(['wcag2a','wcag21a'])
    .analyze();
  expect(results.violations,results.violations.map(item=>`${item.id}: ${item.help}`).join('\n')).toEqual([]);
}

test('homepage navigation and modal behavior remain usable',async({page})=>{
  await page.goto('/');
  await expect(page.locator('main#main-content')).toHaveCount(1);
  await expect(page.getByRole('link',{name:'AX home'})).toBeVisible();
  await page.getByRole('button',{name:'Open categories'}).click();
  const dialog=page.getByRole('dialog',{name:'Categories'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading',{name:'Categories'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expectNoHorizontalPageOverflow(page);
});

test('catalog search and stock filters update the visible products',async({page})=>{
  await page.goto('/products?search=1');
  const search=page.getByRole('searchbox');
  await expect(search).toBeFocused();
  await search.fill('racing');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await expect(page.getByText('Red & White Racing Jacket',{exact:true})).toBeVisible();

  await search.fill('');
  await page.getByRole('button',{name:/FILTERS/}).click();
  const filters=page.locator('#catalog-filters');
  await expect(filters).toBeVisible();
  const medium=filters.getByRole('button',{name:'M',exact:true});
  await expect(medium).toBeVisible();
  await medium.click();
  await expect(page.locator('.collection-count')).toContainText('piece');
  await expect(page.locator('.product-card').first()).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
});

test('PDP requires a size and Add to Bag persists into the drawer',async({page})=>{
  await page.goto(PDP);
  await expect(page.getByRole('heading',{level:1,name:'Premium Long Sleeve Polo'})).toBeVisible();
  const add=page.getByRole('button',{name:/CHOOSE SIZE|ADD TO PREVIEW BAG|ADD TO BAG/}).first();
  await expect(add).toContainText('CHOOSE SIZE');

  await page.locator('.option-values button').filter({hasText:/^M/}).click();
  await expect(page.getByRole('button',{name:/ADD TO PREVIEW BAG|ADD TO BAG/})).toBeEnabled();
  await page.getByRole('button',{name:/ADD TO PREVIEW BAG|ADD TO BAG/}).click();
  await expect(page.getByRole('button',{name:'VIEW BAG'})).toBeVisible();
  await page.getByRole('button',{name:'VIEW BAG'}).click();

  const bag=page.getByRole('dialog',{name:'Your bag'});
  await expect(bag).toBeVisible();
  await expect(bag.getByText('Premium Long Sleeve Polo',{exact:true})).toBeVisible();
  await expect(bag.getByText(/Size: M/)).toBeVisible();
  await expect(bag.locator('.quantity span')).toHaveText('1');
});

for(const [name,path] of [['home','/'],['catalog','/products'],['product',PDP]]){
  test(`${name} has no critical WCAG A violations`,async({page})=>{
    await page.goto(path);
    await expect(page.locator('main#main-content')).toHaveCount(1);
    await expectCriticalA11y(page);
  });
}
