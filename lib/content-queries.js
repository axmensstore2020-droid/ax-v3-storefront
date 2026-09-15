const menuFields='id title url items { id title url items { id title url } }';
export const navigationQuery=`query AXNavigation {
 shop { primaryDomain { host } }
 categories: menu(handle:"ax-categories") { items { ${menuFields} } }
 styles: menu(handle:"ax-style-collections") { items { ${menuFields} } }
 seasons: menu(handle:"ax-seasonal-collections") { items { ${menuFields} } }
}`;
export const pageQuery=`query AXPage($handle:String!) { page(handle:$handle) { id title handle body } }`;
export const policiesQuery=`query AXPolicies {
 shop {
  privacyPolicy { title body url } refundPolicy { title body url }
  shippingPolicy { title body url } termsOfService { title body url }
  legalNotice { title body url } subscriptionPolicy { title body url }
  contactInformation { title body url } termsOfSale { title body url }
 }
 refundPage: page(handle:"contact") { title body }
 shippingPage: page(handle:"shipping-and-delivery-policy") { title body }
 termsPage: page(handle:"terms-of-service") { title body }
}`;
