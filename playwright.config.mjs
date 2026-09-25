import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/e2e',
  fullyParallel:false,
  retries:0,
  workers:1,
  reporter:[['line']],
  timeout:30000,
  expect:{timeout:7000},
  use:{
    baseURL:'http://127.0.0.1:3010',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    video:'retain-on-failure',
    serviceWorkers:'block'
  },
  webServer:{
    command:'npm start -- -p 3010 -H 127.0.0.1',
    url:'http://127.0.0.1:3010',
    timeout:120000,
    reuseExistingServer:false,
    env:{
      ...process.env,
      SHOPIFY_STOREFRONT_PRIVATE_TOKEN:'',
      SHOPIFY_STOREFRONT_ACCESS_TOKEN:'',
      AX_ALLOW_INDEXING:'false',
      AX_SITE_ORIGIN:'https://example.com',
      AX_STYLIST_ENABLED:'false',
      AX_STYLIST_IMAGES_ENABLED:'false'
    }
  },
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},
    {name:'mobile-chromium',use:{...devices['iPhone 13']}}
  ]
});
