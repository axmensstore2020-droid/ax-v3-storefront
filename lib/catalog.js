export const fallbackProducts = [
  {
    id: '10276005806320',
    handle: 'men-s-premium-long-sleeve-polo-t-shirt-smart-casual-wear',
    title: 'Premium Long Sleeve Polo',
    price: 800,
    type: 'T-Shirt',
    image: 'https://cdn.shopify.com/s/files/1/0859/5216/8176/files/rn-image_picker_lib_temp_92a7f347-f730-4c22-a71c-38b64af824ae.jpg?v=1789299771',
    tags: ['Old Money', 'Polo'],
    description: 'A refined long-sleeve polo built for smart casual dressing.'
  },
  {
    id: '10233077006576',
    handle: 'camouflage-graphic-oversized-t-shirt',
    title: 'Camouflage Graphic Oversized T-Shirt',
    price: 750,
    type: 'T-Shirt',
    image: 'https://cdn.shopify.com/s/files/1/0859/5216/8176/files/Screenshot-20260902_210620.jpg?v=1788363502',
    tags: ['Streetwear', 'Oversized'],
    description: 'Relaxed oversized tee with a bold camouflage graphic.'
  },
  {
    id: '10233053348080',
    handle: 'untitmens-pu-leather-zip-up-jacket',
    title: 'PU Leather Zip-Up Jacket',
    price: 1300,
    type: 'Outerwear',
    image: 'https://cdn.shopify.com/s/files/1/0859/5216/8176/files/Screenshot-20260902_203659.jpg?v=1788361996',
    tags: ['Outerwear', 'Streetwear'],
    description: 'A clean PU leather jacket with a versatile zip-up silhouette.'
  },
  {
    id: '10232885805296',
    handle: 'men-s-checked-casual-shirt-full-sleeve',
    title: 'Checked Casual Shirt',
    price: 850,
    type: 'Shirt',
    image: 'https://cdn.shopify.com/s/files/1/0859/5216/8176/files/Screenshot-20260902_173513.jpg?v=1788360840',
    tags: ['Checks', 'Casual'],
    description: 'Classic full-sleeve checked shirt for everyday wear.'
  },
  {
    id: '10232700633328',
    handle: 'imp-flannels-1',
    title: 'Imported Flannel Shirt',
    price: 1200,
    type: 'Shirt',
    image: 'https://cdn.shopify.com/s/files/1/0859/5216/8176/files/Screenshot-20260901_210328.jpg?v=1788346853',
    tags: ['Flannel', 'Old School'],
    description: 'Imported flannel shirt with a relaxed everyday fit.'
  },
  {
    id: '10226456822000',
    handle: 'red-white-racing-jacket-for-men',
    title: 'Red & White Racing Jacket',
    price: 6300,
    type: 'Outerwear',
    image: 'https://cdn.shopify.com/s/files/1/0859/5216/8176/files/rn-image_picker_lib_temp_b6d020e4-a880-4191-ad23-45d77d902277.jpg?v=1788080041',
    tags: ['Racing', 'Streetwear'],
    description: 'Statement racing jacket with bold contrast paneling.'
  }
];

export function formatMoney(value,currency='INR'){return new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:Number(value)%1?2:0}).format(value);}
export const formatINR=value=>formatMoney(value,'INR');
