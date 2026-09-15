'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';
import Icon from './Icon';
import {navigation,styleWorlds,matchesCategory,matchesStyle,matchesSearch} from '../lib/navigation';
export default function ProductGridClient({products,title='New in',initialTerm='',initialType='all',initialStyle='',searchOpen=false,collection=false,home=false}) {
 const [wide,setWide]=useState(false), [term,setTerm]=useState(initialTerm), [category,setCategory]=useState(initialType), [style,setStyle]=useState(initialStyle);
 const input=useRef(null);
 useEffect(() => {setTerm(initialTerm);setCategory(initialType);setStyle(initialStyle);},[initialTerm,initialType,initialStyle]);
 useEffect(() => {if(searchOpen) input.current?.focus();},[searchOpen]);
 const filtered=useMemo(() => products.filter(p => matchesCategory(p,category) && matchesStyle(p,style) && matchesSearch(p,term)),[products,category,style,term]);
 const heading=styleWorlds.find(item => item.key===style)?.label || title, Heading=home?'h2':'h1';
 function reset(){setTerm('');setCategory('all');setStyle('');}
 return <><div className="collection-title"><div><p className="eyebrow">THE AX COLLECTION</p><Heading className="serif">{heading}</Heading></div><span className="collection-count" role="status">{filtered.length} {filtered.length===1?'piece':'pieces'}</span></div><div className="collection-toolbar">{!home && <label className="search-box"><Icon name="search"/><span className="sr-only">Search products</span><input ref={input} value={term} onChange={e => setTerm(e.target.value)} placeholder="Search the collection" type="search"/></label>}<button className={`wide-toggle${wide?' active':''}`} aria-pressed={wide} onClick={() => setWide(!wide)}><Icon name="wide"/>WIDE VIEW<span className="toggle-track" aria-hidden="true"><span/></span></button></div>
 {!home && <div className="filter-row">{collection?navigation.map(item => <Link key={item.key} href={item.href} className={item.label.toLowerCase()===title.toLowerCase()?'active':''}>{item.label}</Link>):navigation.map(item => <button key={item.key} className={category===item.key?'active':''} aria-pressed={category===item.key} onClick={() => setCategory(item.key)}>{item.key==='all'?'All pieces':item.label}</button>)}{style && <button className="clear-filter" onClick={() => setStyle('')}>Clear style <Icon name="close" size={14}/></button>}</div>}
 {filtered.length?<section className={`product-grid${wide?' wide':''}`} aria-label="Products">{filtered.map(product => <ProductCard key={product.id} product={product} compact={wide}/>)}</section>:<div className="empty-products"><h2 className="serif">Nothing here just yet.</h2><p>{term?'Try a different search or explore the latest arrivals.':'More pieces are on the way. Explore what’s new at AX.'}</p>{collection?<Link className="underlined-link" href="/products">EXPLORE NEW IN <Icon name="arrow"/></Link>:<button className="underlined-link" onClick={reset}>VIEW ALL PIECES <Icon name="arrow"/></button>}</div>}</>;
}
