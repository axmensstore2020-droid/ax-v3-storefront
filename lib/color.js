export function swatchColor(value='') {
  const color=String(value||'').trim().toLowerCase();
  if(color.includes('black'))return '#151515';
  if(color.includes('white'))return '#ffffff';
  if(color.includes('ivory'))return '#f1ead8';
  if(color.includes('red'))return '#a82727';
  if(color.includes('maroon')||color.includes('burgundy'))return '#6f1d2b';
  if(color.includes('green')||color.includes('olive'))return '#53664b';
  if(color.includes('yellow')||color.includes('mustard'))return '#d5ad37';
  if(color.includes('brown')||color.includes('chocolate'))return '#6c4b38';
  if(color.includes('beige')||color.includes('cream')||color.includes('ecru'))return '#ddd1b9';
  if(color.includes('khaki')||color.includes('tan'))return '#b29b72';
  if(color.includes('grey')||color.includes('gray')||color.includes('charcoal'))return '#7b7b78';
  if(color.includes('navy'))return '#24324a';
  if(color.includes('blue')||color.includes('denim'))return '#58739a';
  if(color.includes('teal'))return '#3f7774';
  if(color.includes('pink'))return '#d9a4ad';
  if(color.includes('orange'))return '#c76c35';
  if(color.includes('purple')||color.includes('violet'))return '#745b7d';
  return '#b8b8b2';
}
