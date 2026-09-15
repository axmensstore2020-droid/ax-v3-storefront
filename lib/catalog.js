export const fallbackProducts = [
  {
    id: '10276005806320',
    handle: 'men-s-premium-long-sleeve-polo-t-shirt-smart-casual-wear',
    title: 'Premium Long Sleeve Polo',
    price: 800,
    type: 'T-Shirt',
    image: 'https://cdn.shopify.com/s/files/1/0859/5216/8176/files/rn-image_picker_lib_temp_92a7f347-f730-4c22-a71c-38b64af824ae.jpg?v=1789299771',
    tags: ['Old Money', 'Polo'],
    description: 'A refined long-sleeve polo built for smart casual dressing.',
    productNumber: 'AX-POLO-001',fit: 'Regular through the body',fabric: 'Cotton pique',color: 'Ecru',style: 'Old money',
    sizeMeasurements: {S:{chest:'38',length:'27'},M:{chest:'40',length:'28'},L:{chest:'42',length:'29'}},
    sizeRecommendations: {S:'Recommended for a closer fit',M:'Balanced everyday fit',L:'Relaxed fit'},care: 'Machine wash cold with similar colours.'
  },
  {
    id: '10233077006576',
    handle: 'camouflage-graphic-oversized-t-shirt',
    title: 'Camouflage Graphic Oversized T-Shirt',
    price: 750,
    type: 'T-Shirt',
    image: 'https://cdn.shopify.com/s/files/1/0859/5216/8176/files/Screenshot-20260902_210620.jpg?v=1788363502',
    tags: ['Streetwear', 'Oversized'],
    description: 'Relaxed oversized tee with a bold camouflage graphic.',
    productNumber: 'AX-TEE-002',fit: 'Oversized',fabric: '100% cotton jersey',color: 'Olive / black',style: 'Streetwear',
    sizeMeasurements: {S:{chest:'42',length:'27'},M:{chest:'44',length:'28'},L:{chest:'46',length:'29'}},
    sizeRecommendations: {S:'Recommended based on a regular-fit preference',M:'Relaxed fit',L:'Extra oversized fit'},care: 'Turn inside out and wash cold.'
  },
  {
    id: '10233053348080',
    handle: 'untitmens-pu-leather-zip-up-jacket',
    title: 'PU Leather Zip-Up Jacket',
    price: 1300,
    type: 'Outerwear',
    image: 'https://cdn.shopify.com/s/files/1/0859/5216/8176/files/Screenshot-20260902_203659.jpg?v=1788361996',
    tags: ['Outerwear', 'Streetwear'],
    description: 'A clean PU leather jacket with a versatile zip-up silhouette.',
    productNumber: 'AX-JKT-003',fit: 'Relaxed',fabric: 'PU leather shell; polyester lining',color: 'Black',style: 'Streetwear',
    sizeMeasurements: {S:{chest:'40',length:'25'},M:{chest:'42',length:'26'},L:{chest:'44',length:'27'}},
    sizeRecommendations: {S:'Recommended for a closer fit',M:'Relaxed fit',L:'Layering fit'},care: 'Wipe clean. Do not machine wash.'
  },
  {
    id: '10232885805296',
    handle: 'men-s-checked-casual-shirt-full-sleeve',
    title: 'Checked Casual Shirt',
    price: 850,
    type: 'Shirt',
    image: 'https://cdn.shopify.com/s/files/1/0859/5216/8176/files/Screenshot-20260902_173513.jpg?v=1788360840',
    tags: ['Checks', 'Casual'],
    description: 'Classic full-sleeve checked shirt for everyday wear.',
    productNumber: 'AX-SHT-004',fit: 'Regular',fabric: 'Cotton flannel',color: 'Red check',style: 'Casual fits',
    sizeMeasurements: {S:{chest:'40',length:'27'},M:{chest:'42',length:'28'},L:{chest:'44',length:'29'}},
    sizeRecommendations: {S:'Recommended for a closer fit',M:'Relaxed fit',L:'Layering fit'},care: 'Wash with similar colours.'
  },
  {
    id: '10232700633328',
    handle: 'imp-flannels-1',
    title: 'Imported Flannel Shirt',
    price: 1200,
    type: 'Shirt',
    image: 'https://cdn.shopify.com/s/files/1/0859/5216/8176/files/Screenshot-20260901_210328.jpg?v=1788346853',
    tags: ['Flannel', 'Old School'],
    description: 'Imported flannel shirt with a relaxed everyday fit.',
    productNumber: 'AX-FLN-005',fit: 'Relaxed',fabric: 'Brushed cotton flannel',color: 'Blue check',style: 'Old school',
    sizeMeasurements: {S:{chest:'41',length:'27'},M:{chest:'43',length:'28'},L:{chest:'45',length:'29'}},
    sizeRecommendations: {S:'Recommended for a closer fit',M:'Relaxed fit',L:'Layering fit'},care: 'Wash cold and line dry.'
  },
  {
    id: '10226456822000',
    handle: 'red-white-racing-jacket-for-men',
    title: 'Red & White Racing Jacket',
    price: 6300,
    type: 'Outerwear',
    image: 'https://cdn.shopify.com/s/files/1/0859/5216/8176/files/rn-image_picker_lib_temp_b6d020e4-a880-4191-ad23-45d77d902277.jpg?v=1788080041',
    tags: ['Racing', 'Streetwear'],
    description: 'Statement racing jacket with bold contrast paneling.',
    productNumber: 'AX-RAC-006',fit: 'Relaxed',fabric: 'Polyester shell',color: 'Red / white',style: 'Streetwear',
    sizeMeasurements: {S:{chest:'42',length:'26'},M:{chest:'44',length:'27'},L:{chest:'46',length:'28'}},
    sizeRecommendations: {S:'Recommended for a closer fit',M:'Relaxed fit',L:'Layering fit'},care: 'Dry clean only.'
  }
];

export function formatMoney(value,currency='INR'){return new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:Number(value)%1?2:0}).format(value);}
export const formatINR=value=>formatMoney(value,'INR');
