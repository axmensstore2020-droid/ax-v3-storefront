'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter,usePathname} from 'next/navigation';
import ProductCard from './ProductCard';
import ProductImage from './ProductImage';
import Icon from './Icon';
import {formatMoney} from '../lib/catalog';
import {styleWorlds,canonicalStyle,flattenNavigation,matchesCategory,matchesStyle,matchesSearch,normalize} from '../lib/navigation';
import {useNavigation} from './NavigationProvider';
import {trackStoreEvent} from '../lib/store-analytics';

function optionValues(product,pattern){
 const option=(product.options||[]).find(item=>pattern.test(item.name||''));
 return option?.values || option?.optionValues?.map(value=>value.name) || [];
}
function unique(values){return [...new Set(values.map(value=>String(value||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));}
function priceMatch(price,band){
 if(!band)return true;
 if(band==='under-750')return price<750;
 if(band==='750-999')return price>=750&&price<=999;
 if(band==='1000-1499')return price>=1000&&price<=1499;
 return band==='1500-plus'?price>=1500:true;
}

export default function ProductGridClient({products,title='New in',initialTerm='',initialType='all',initialStyle='',searchOpen=false,collection=false,home=false}) {
 const [wide,setWide]=useState(false),[term,setTerm]=useState(initialTerm),[category,setCategory]=useState(initialType),[style,setStyle]=useState(initialStyle);
 const [size,setSize]=useState(''),[color,setColor]=useState(''),[fit,setFit]=useState(''),[priceBand,setPriceBand]=useState(''),[availability,setAvailability]=useState(''),[sort,setSort]=useState('featured');
 const input=useRef(null),searchTimer=useRef(null);
 const router=useRouter(),path=usePathname(),{categories}=useNavigation();
 const menu=flattenNavigation(categories),current=menu.find(item=>item.href===path)?.href || '';
 useEffect(()=>{setTerm(initialTerm);setCategory(initialType);setStyle(initialStyle);},[initialTerm,initialType,initialStyle]);
 useEffect(()=>{if(searchOpen) input.current?.focus();},[searchOpen]);
 useEffect(()=>{
  clearTimeout(searchTimer.current);
  if(term.trim().length<2)return;
  searchTimer.current=setTimeout(()=>trackStoreEvent('search',{metadata:{query:term.trim().slice(0,80)}}),600);
  return()=>clearTimeout(searchTimer.current);
 },[term]);

 const sizes=useMemo(()=>unique(products.flatMap(product=>optionValues(product,/size/i))),[products]);
 const colors=useMemo(()=>unique(products.flatMap(product=>[...optionValues(product,/^colou?r$/i),...(product.color?String(product.color).split(','):[])])),[products]);
 const fits=useMemo(()=>unique(products.map(product=>product.fit)),[products]);

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
   if(!priceMatch(Number(product.price||0),priceBand))return false;
   return true;
  });
  return [...result].sort((a,b)=>{
   if(sort==='price-asc')return Number(a.price||0)-Number(b.price||0);
   if(sort==='price-desc')return Number(b.price||0)-Number(a.price||0);
   if(sort==='title')return a.title.localeCompare(b.title);
   return 0;
  });
 },[products,category,style,term,size,color,fit,availability,priceBand,sort]);

 const suggestions=useMemo(()=>term.trim().length>=2?products.filter(product=>matchesSearch(product,term)).slice(0,5):[],[products,term]);
 const heading=styleWorlds.find(item=>item.key===canonicalStyle(style))?.label||title,Heading=home?'h2':'h1';
 const activeFilters=Boolean(style||category!=='all'||size||color||fit||priceBand||availability||sort!=='featured');
 function reset(){setTerm('');setCategory('all');setStyle('');setSize('');setColor('');setFit('');setPriceBand('');setAvailability('');setSort('featured');}
 function change(setter,name){return event=>{const value=event.target.value;setter(value);trackStoreEvent('filter',{metadata:{filter:name,value:value||'all'}});};}

 return <><div className="collection-title"><div><p className="eyebrow">THE AX COLLECTION</p><Heading className="editorial">{heading}</Heading></div><span className="collection-count" role="status">{filtered.length} {filtered.length===1?'piece':'pieces'}</span></div>
 <div className="collection-toolbar">{!home&&<div className="search-shell"><label className="search-box"><Icon name="search"/><span className="sr-only">Search products</span><input ref={input} value={term} onChange={e=>setTerm(e.target.value)} placeholder="Search products, colours or styles" type="search"/></label>{suggestions.length>0&&<div className="search-suggestions">{suggestions.map(product=><Link href={`/products/${product.handle}`} key={product.id}><span className="search-thumb"><ProductImage src={product.image} alt="" sizes="48px"/></span><span>{product.title}<small>{formatMoney(product.price,product.currency)}</small></span></Link>)}</div>}</div>}
 <button className={`wide-toggle${wide?' active':''}`} aria-pressed={wide} onClick={()=>setWide(!wide)}><Icon name="wide"/>WIDE VIEW<span className="toggle-track" aria-hidden="true"><span/></span></button></div>
 {!home&&<div className="filter-row advanced-filters">
  <Link href="/collections">Collections</Link>
  <label className="category-select"><span className="sr-only">Browse categories</span><select aria-label="Browse categories" value={current} onChange={e=>router.push(e.target.value)}><option value="" disabled>Category</option>{menu.map(item=><option key={item.key} value={item.href}>{item.label}</option>)}</select><Icon name="chevron" size={14}/></label>
  {sizes.length>0&&<label className="filter-select"><span>Size</span><select value={size} onChange={change(setSize,'size')}><option value="">All</option>{sizes.map(value=><option key={value}>{value}</option>)}</select></label>}
  {colors.length>0&&<label className="filter-select"><span>Colour</span><select value={color} onChange={change(setColor,'colour')}><option value="">All</option>{colors.map(value=><option key={value}>{value}</option>)}</select></label>}
  {fits.length>0&&<label className="filter-select"><span>Fit</span><select value={fit} onChange={change(setFit,'fit')}><option value="">All</option>{fits.map(value=><option key={value}>{value}</option>)}</select></label>}
  <label className="filter-select"><span>Style</span><select value={style} onChange={change(setStyle,'style')}><option value="">All</option>{styleWorlds.map(item=><option value={item.key} key={item.key}>{item.label}</option>)}</select></label>
  <label className="filter-select"><span>Price</span><select value={priceBand} onChange={change(setPriceBand,'price')}><option value="">All</option><option value="under-750">Under ₹750</option><option value="750-999">₹750–₹999</option><option value="1000-1499">₹1,000–₹1,499</option><option value="1500-plus">₹1,500+</option></select></label>
  <label className="filter-select"><span>Stock</span><select value={availability} onChange={change(setAvailability,'stock')}><option value="">All</option><option value="in-stock">In stock</option></select></label>
  <label className="filter-select"><span>Sort</span><select value={sort} onChange={change(setSort,'sort')}><option value="featured">Featured</option><option value="price-asc">Price low to high</option><option value="price-desc">Price high to low</option><option value="title">A–Z</option></select></label>
  {activeFilters&&<button className="clear-filter" onClick={reset}>Clear <Icon name="close" size={14}/></button>}
 </div>}
 {filtered.length?<section className={`product-grid${wide?' wide':''}`} aria-label="Products">{filtered.map(product=><ProductCard key={product.id} product={product} compact={wide}/>)}</section>:<div className="empty-products"><h2 className="editorial">Nothing here just yet.</h2><p>{term?'Try a different search or change a filter.':'More pieces are on the way. Explore what’s new at AX.'}</p>{collection?<Link className="underlined-link" href="/products">EXPLORE NEW IN <Icon name="arrow"/></Link>:<button className="underlined-link" onClick={reset}>VIEW ALL PIECES <Icon name="arrow"/></button>}</div>}</>;
}
