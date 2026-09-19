'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';
import ProductImage from './ProductImage';
import Icon from './Icon';
import {formatMoney} from '../lib/catalog';
import {styleWorlds,canonicalStyle,matchesCategory,matchesStyle,matchesSearch,normalize} from '../lib/navigation';
import {trackStoreEvent} from '../lib/store-analytics';

function optionValues(product,pattern){
 const option=(product.options||[]).find(item=>pattern.test(item.name||''));
 return option?.values || option?.optionValues?.map(value=>value.name) || [];
}
function unique(values){return [...new Set(values.map(value=>String(value||'').trim()).filter(Boolean))];}
function discountPercent(product){
 const price=Number(product.price||0),compareAt=Number(product.compareAtPrice||0);
 return Number.isFinite(compareAt)&&compareAt>price?((compareAt-price)/compareAt)*100:0;
}
function swatchColor(value){
 const color=normalize(value);
 if(color.includes('black'))return '#151515';
 if(color.includes('white'))return '#ffffff';
 if(color.includes('red'))return '#a82727';
 if(color.includes('maroon')||color.includes('burgundy'))return '#6f1d2b';
 if(color.includes('green')||color.includes('olive'))return '#53664b';
 if(color.includes('yellow')||color.includes('mustard'))return '#d5ad37';
 if(color.includes('brown')||color.includes('chocolate'))return '#6c4b38';
 if(color.includes('beige')||color.includes('cream')||color.includes('ecru'))return '#ddd1b9';
 if(color.includes('grey')||color.includes('gray')||color.includes('charcoal'))return '#7b7b78';
 if(color.includes('navy'))return '#24324a';
 if(color.includes('blue')||color.includes('denim'))return '#58739a';
 if(color.includes('pink'))return '#d9a4ad';
 if(color.includes('orange'))return '#c76c35';
 if(color.includes('purple')||color.includes('violet'))return '#745b7d';
 return '#b8b8b2';
}
function sizeRank(value){
 const key=String(value||'').trim().toUpperCase();
 const order=['XXS','XS','S','M','L','XL','XXL','XXXL'];
 const index=order.indexOf(key);
 return index===-1?100:index;
}

const SORT_OPTIONS=[
 ['featured','Featured'],
 ['recent','Recent addition'],
 ['price-asc','Price: low to high'],
 ['price-desc','Price: high to low'],
 ['discount-desc','Discount: high to low'],
 ['discount-asc','Discount: low to high']
];

export default function ProductGridClient({products,title='New in',initialTerm='',initialType='all',initialStyle='',searchOpen=false,collection=false,home=false}) {
 const priceCeiling=useMemo(()=>{
  const highest=Math.max(0,...products.map(product=>Number(product.price||0)).filter(Number.isFinite));
  return Math.max(100,Math.ceil(highest/100)*100);
 },[products]);
 const [wide,setWide]=useState(false),[term,setTerm]=useState(initialTerm),[category,setCategory]=useState(initialType),[style,setStyle]=useState(initialStyle);
 const [size,setSize]=useState(''),[color,setColor]=useState(''),[fit,setFit]=useState(''),[availability,setAvailability]=useState('');
 const [priceMin,setPriceMin]=useState(0),[priceMax,setPriceMax]=useState(priceCeiling),[sort,setSort]=useState('featured');
 const [filtersOpen,setFiltersOpen]=useState(false),[sortOpen,setSortOpen]=useState(false);
 const input=useRef(null),searchTimer=useRef(null);

 useEffect(()=>{setTerm(initialTerm);setCategory(initialType);setStyle(initialStyle);},[initialTerm,initialType,initialStyle]);
 useEffect(()=>{setPriceMin(0);setPriceMax(priceCeiling);},[priceCeiling]);
 useEffect(()=>{if(searchOpen) input.current?.focus();},[searchOpen]);
 useEffect(()=>{
  clearTimeout(searchTimer.current);
  if(term.trim().length<2)return;
  searchTimer.current=setTimeout(()=>trackStoreEvent('search',{metadata:{query:term.trim().slice(0,80)}}),600);
  return()=>clearTimeout(searchTimer.current);
 },[term]);

 const sizes=useMemo(()=>unique(products.flatMap(product=>optionValues(product,/size/i))).sort((a,b)=>sizeRank(a)-sizeRank(b)||a.localeCompare(b)),[products]);
 const colors=useMemo(()=>unique(products.flatMap(product=>[...optionValues(product,/^colou?r$/i),...(product.color?String(product.color).split(','):[])])).sort((a,b)=>a.localeCompare(b)),[products]);
 const fits=useMemo(()=>unique(products.map(product=>product.fit)).sort((a,b)=>a.localeCompare(b)),[products]);

 const filtered=useMemo(()=>{
  const result=products.filter(product=>{
   if(!matchesCategory(product,category)||!matchesStyle(product,style)||!matchesSearch(product,term))return false;
   if(size && !optionValues(product,/size/i).some(value=>normalize(value)===normalize(size)))return false;
   if(color){
    const values=[...optionValues(product,/^colou?r$/i),product.color||''];
    if(!values.some(value=>normalize(value).includes(normalize(color))))return false;
   }
   if(fit && normalize(product.fit)!==normalize(fit))return false;
   if(availability==='in-stock' && product.availableForSale===false)return false;
   const price=Number(product.price||0);
   if(Number.isFinite(price)&&(price<priceMin||price>priceMax))return false;
   return true;
  });
  return [...result].sort((a,b)=>{
   if(sort==='price-asc')return Number(a.price||0)-Number(b.price||0);
   if(sort==='price-desc')return Number(b.price||0)-Number(a.price||0);
   if(sort==='discount-asc')return discountPercent(a)-discountPercent(b);
   if(sort==='discount-desc')return discountPercent(b)-discountPercent(a);
   if(sort==='recent')return Date.parse(b.createdAt||b.updatedAt||0)-Date.parse(a.createdAt||a.updatedAt||0);
   return 0;
  });
 },[products,category,style,term,size,color,fit,availability,priceMin,priceMax,sort]);

 const suggestions=useMemo(()=>term.trim().length>=2?products.filter(product=>matchesSearch(product,term)).slice(0,5):[],[products,term]);
 const heading=styleWorlds.find(item=>item.key===canonicalStyle(style))?.label||title,Heading=home?'h2':'h1';
 const activeFilterCount=[size,color,fit,availability,style].filter(Boolean).length+(priceMin>0||priceMax<priceCeiling?1:0);
 const sortLabel=SORT_OPTIONS.find(([value])=>value===sort)?.[1]||'Featured';

 function resetFilters(){
  setSize('');setColor('');setFit('');setAvailability('');setStyle(initialStyle||'');setPriceMin(0);setPriceMax(priceCeiling);
  trackStoreEvent('filter',{metadata:{filter:'reset',value:'all'}});
 }
 function choose(setter,name,value){
  setter(value);
  trackStoreEvent('filter',{metadata:{filter:name,value:value||'all'}});
 }

 return <><div className="collection-title"><div><p className="eyebrow">THE AX COLLECTION</p><Heading className="editorial">{heading}</Heading></div><span className="collection-count" role="status">{filtered.length} {filtered.length===1?'piece':'pieces'}</span></div>
 <div className="collection-toolbar">{!home&&<div className="search-shell"><label className="search-box"><Icon name="search"/><span className="sr-only">Search products</span><input ref={input} value={term} onChange={e=>setTerm(e.target.value)} placeholder="Search products, colours or styles" type="search"/></label>{suggestions.length>0&&<div className="search-suggestions">{suggestions.map(product=><Link href={`/products/${product.handle}`} key={product.id}><span className="search-thumb"><ProductImage src={product.image} alt="" sizes="48px"/></span><span>{product.title}<small>{formatMoney(product.price,product.currency)}</small></span></Link>)}</div>}</div>}
 <button className={`wide-toggle${wide?' active':''}`} aria-pressed={wide} onClick={()=>setWide(current=>!current)}><Icon name="wide"/>WIDE VIEW<span className="toggle-track" aria-hidden="true"><span/></span></button></div>

 {!home&&<>
  <div className="catalog-refinement-bar">
   <button type="button" className={filtersOpen?'active':''} aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={()=>{setFiltersOpen(open=>!open);setSortOpen(false);}}>
    <span>FILTERS{activeFilterCount>0?` (${activeFilterCount})`:''}</span><Icon name="chevron" size={14}/>
   </button>
   <button type="button" className={sortOpen?'active':''} aria-expanded={sortOpen} aria-controls="catalog-sort" onClick={()=>{setSortOpen(open=>!open);setFiltersOpen(false);}}>
    <span>SORT BY</span><small>{sortLabel}</small><Icon name="chevron" size={14}/>
   </button>
  </div>

  {filtersOpen&&<section id="catalog-filters" className="catalog-panel filter-panel" aria-label="Product filters">
   <div className="filter-panel-head"><strong>Filters</strong>{activeFilterCount>0&&<button type="button" onClick={resetFilters}>Clear all</button>}</div>
   {sizes.length>0&&<div className="filter-group"><p>Sizes</p><div className="filter-chips">{sizes.map(value=><button type="button" key={value} aria-pressed={size===value} className={size===value?'selected':''} onClick={()=>choose(setSize,'size',size===value?'':value)}>{value}</button>)}</div></div>}
   <div className="filter-group price-filter"><div className="filter-group-title"><p>Price</p><span>{formatMoney(priceMin,'INR')} – {formatMoney(priceMax,'INR')}</span></div>
    <label><span>Minimum</span><input type="range" min="0" max={priceCeiling} step="50" value={priceMin} onChange={e=>{const value=Math.min(Number(e.target.value),priceMax);setPriceMin(value);}}/></label>
    <label><span>Maximum</span><input type="range" min="0" max={priceCeiling} step="50" value={priceMax} onChange={e=>{const value=Math.max(Number(e.target.value),priceMin);setPriceMax(value);}}/></label>
   </div>
   {colors.length>0&&<div className="filter-group"><p>Colours</p><div className="colour-filters">{colors.map(value=><button type="button" key={value} aria-pressed={color===value} className={color===value?'selected':''} onClick={()=>choose(setColor,'colour',color===value?'':value)}><span className="colour-swatch" style={{backgroundColor:swatchColor(value)}} aria-hidden="true"/><span>{value}</span></button>)}</div></div>}
   {fits.length>0&&<div className="filter-group"><p>Fit</p><div className="filter-chips">{fits.map(value=><button type="button" key={value} aria-pressed={fit===value} className={fit===value?'selected':''} onClick={()=>choose(setFit,'fit',fit===value?'':value)}>{value}</button>)}</div></div>}
   <div className="filter-group"><p>Style</p><div className="filter-chips">{styleWorlds.map(item=><button type="button" key={item.key} aria-pressed={style===item.key} className={style===item.key?'selected':''} onClick={()=>choose(setStyle,'style',style===item.key?'':item.key)}>{item.label}</button>)}</div></div>
   <div className="filter-group"><p>Availability</p><button type="button" className={`stock-filter${availability==='in-stock'?' selected':''}`} aria-pressed={availability==='in-stock'} onClick={()=>choose(setAvailability,'stock',availability==='in-stock'?'':'in-stock')}><span aria-hidden="true"/><strong>In stock only</strong></button></div>
  </section>}

  {sortOpen&&<section id="catalog-sort" className="catalog-panel sort-panel" aria-label="Sort products">
   {SORT_OPTIONS.map(([value,label])=><button type="button" key={value} className={sort===value?'selected':''} aria-pressed={sort===value} onClick={()=>{setSort(value);setSortOpen(false);trackStoreEvent('filter',{metadata:{filter:'sort',value}});}}><span>{label}</span>{sort===value&&<span aria-hidden="true">✓</span>}</button>)}
  </section>}
 </>}

 {filtered.length?<section className={`product-grid${wide?' wide':''}`} aria-label="Products">{filtered.map(product=><ProductCard key={product.id} product={product} compact={wide}/>)}</section>:<div className="empty-products"><h2 className="editorial">Nothing here just yet.</h2><p>{term?'Try a different search or change a filter.':'More pieces are on the way. Explore what’s new at AX.'}</p>{collection?<Link className="underlined-link" href="/products">EXPLORE NEW IN <Icon name="arrow"/></Link>:<button className="underlined-link" onClick={resetFilters}>VIEW ALL PIECES <Icon name="arrow"/></button>}</div>}</>;
}
