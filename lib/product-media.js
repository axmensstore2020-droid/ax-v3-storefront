// Shopify exposes playable sources only after a hosted video finishes processing.
export function productVideos(nodes = []) {
  return nodes.filter(item => item?.mediaContentType === 'VIDEO').flatMap(item => {
    const sources = (item.sources || []).filter(source =>
      source?.mimeType === 'video/mp4' && /^https:\/\//.test(source.url || '')
    ).sort((a, b) => Math.abs((a.height || 720) - 720) - Math.abs((b.height || 720) - 720));
    return sources.length ? [{id:item.id, type:'video', altText:item.alt || '',
      poster:item.previewImage?.url || '', sources}] : [];
  });
}

export function productGallery(product, primary) {
  const images = [...new Map([primary, ...(product.images || [])]
    .filter(image => image?.url).map(image => [image.url, {...image, type:'image'}])).values()];
  // Lead with model videos; the selected variant remains the first still photo.
  return [...(product.videos || []), ...images];
}
