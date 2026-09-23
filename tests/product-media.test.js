import test from 'node:test';
import assert from 'node:assert/strict';
import {productVideos, productGallery} from '../lib/product-media.js';

test('only playable Shopify hosted videos enter the gallery, with a mobile-sized MP4 first', () => {
  const videos = productVideos([
    {id:'image', mediaContentType:'IMAGE'},
    {id:'processing', mediaContentType:'VIDEO', sources:[]},
    {id:'external', mediaContentType:'EXTERNAL_VIDEO'},
    {id:'ready', mediaContentType:'VIDEO', alt:'Jacket model', previewImage:{url:'https://cdn.shopify.com/poster.jpg'}, sources:[
      {url:'https://cdn.shopify.com/1080.mp4', mimeType:'video/mp4', height:1080},
      {url:'https://cdn.shopify.com/720.mp4', mimeType:'video/mp4', height:720},
      {url:'https://cdn.shopify.com/video.m3u8', mimeType:'application/x-mpegURL'},
      {url:'javascript:alert(1)', mimeType:'video/mp4'}
    ]}
  ]);
  assert.equal(videos.length, 1);
  assert.equal(videos[0].sources.length, 2);
  assert.equal(videos[0].sources[0].height, 720);
  assert.equal(videos[0].poster, 'https://cdn.shopify.com/poster.jpg');
});

test('videos lead the gallery, followed by the chosen colour image and deduplicated photos', () => {
  const red={url:'red.jpg'}, black={url:'black.jpg'}, video={id:'video', type:'video'};
  const product={images:[red, black, red], videos:[video]};
  assert.deepEqual(productGallery(product, red).map(m=>m.id || m.url), ['video','red.jpg','black.jpg']);
  assert.deepEqual(productGallery(product, black).map(m=>m.id || m.url), ['video','black.jpg','red.jpg']);
  assert.deepEqual(productGallery({images:[red,red]}, red).map(m=>m.url), ['red.jpg']);
  assert.deepEqual(productGallery({videos:[video]}), [video]);
});
