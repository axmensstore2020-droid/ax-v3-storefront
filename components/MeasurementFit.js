'use client';
import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {StylistButton} from './StylistProvider';
import Icon from './Icon';
import MeasurementIllustration from './MeasurementIllustrations';
import styles from './MeasurementFit.module.css';
import {trackStoreEvent} from '../lib/store-analytics';
import {canonicalMeasurementField,convertMeasurementValue,formatMeasurementDisplay,measurementCategory,measurementFieldsForProduct,measurementLabel,normalizeMeasurementRows} from '../lib/measurements';

const GUIDE_COPY={
 tee:{title:'Measure a T-shirt you already own',sub:'Lay it flat · Measure in cm · Do not stretch',note:'Chest is entered as full garment circumference: pit-to-pit ×2. Other measurements are entered as measured.'},
 shirt:{title:'Measure a shirt you already own',sub:'Lay it flat · Measure in cm · Do not stretch',note:'Chest is entered as full garment circumference: pit-to-pit ×2. Other measurements are entered as measured.'},
 hoodie:{title:'Measure a hoodie you already own',sub:'Lay it flat · Measure in cm · Do not stretch',note:'Chest is entered as full garment circumference: pit-to-pit ×2. Other measurements are entered as measured.'},
 jacket:{title:'Measure a jacket you already own',sub:'Close it naturally · Lay flat · Measure in cm',note:'Chest is entered as full garment circumference: pit-to-pit ×2. Other measurements are entered as measured.'},
 bottom:{title:'Measure trousers / jeans / cargo',sub:'Lay flat · Waist relaxed · Measure in cm',note:'Waist, hip, thigh and leg opening are entered as full garment circumference: flat width ×2. Rise, inseam and outseam are entered as measured.'},
 shorts:{title:'Measure shorts you already own',sub:'Lay flat · Waist relaxed · Measure in cm',note:'Waist, hip, thigh and leg opening are entered as full garment circumference: flat width ×2. Rise, inseam and outseam are entered as measured.'}
};

function sizeOrder(product,measurements,fits){const optionValues=product.options?.find(option=>/size/i.test(option.name))?.values||[];return [...new Set([...optionValues,...Object.keys(measurements||{}),...Object.keys(fits||{})])];}
function observedColumns(measurements){const columns=[];Object.values(measurements||{}).forEach(row=>{if(!row||typeof row!=='object'||Array.isArray(row))return;Object.keys(row).forEach(raw=>{const key=canonicalMeasurementField(raw);if(!columns.includes(key))columns.push(key);});});return columns;}
function hasValue(value){return value!==undefined&&value!==null&&value!=='';}

export default function MeasurementFit({product,selectedOptions={},inline=false}){
 const [unit,setUnit]=useState('cm');
 const [open,setOpen]=useState(false);
 const [tab,setTab]=useState('chart');
 const [mounted,setMounted]=useState(false);
 const category=measurementCategory(product);
 const normalized=useMemo(()=>normalizeMeasurementRows(product.sizeMeasurements||{},{unit:product.measurementUnit,basis:product.measurementBasis,category}),[product.sizeMeasurements,product.measurementUnit,product.measurementBasis,category]);
 const measurements=normalized.rows||{};
 const sizes=sizeOrder(product,measurements,product.sizeFits||{});
 const preferred=measurementFieldsForProduct(product),observed=observedColumns(measurements);
 const columns=(preferred.length?preferred:observed).filter(field=>sizes.some(size=>hasValue(measurements[size]?.[field])));
 const hasMeasurements=columns.length>0&&sizes.some(size=>measurements[size]&&typeof measurements[size]==='object');
 const hasNotes=sizes.some(size=>product.sizeFits?.[size]?.text);
 const hasFitContent=Boolean(product.fit||hasNotes||product.modelHeight||product.modelSize);
 const canMeasure=Boolean(category&&GUIDE_COPY[category]);
 const canConvert=normalized.unit==='cm',displayUnit=canConvert?unit:normalized.unit||product.measurementUnit||'';
 const fullCircumference=normalized.basis==='circumference';
 const scrollTable=columns.length>4;
 const guide=GUIDE_COPY[category];

 useEffect(()=>setMounted(true),[]);
 useEffect(()=>{
  if(!open)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const onKey=(event)=>{if(event.key==='Escape')setOpen(false);};
  window.addEventListener('keydown',onKey);
  return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey);};
 },[open]);

 if(!hasMeasurements&&!hasFitContent&&!canMeasure)return null;
 const launch=()=>{
  setTab(hasMeasurements?'chart':hasFitContent?'fit':'measure');
  setOpen(true);
  trackStoreEvent('size_guide',{productHandle:product.handle,metadata:{hasMeasurements,category:category||''}});
 };
 const sheet=mounted&&open?<div className={styles.overlay} onMouseDown={()=>setOpen(false)}>
  <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="size-fit-title" onMouseDown={event=>event.stopPropagation()}>
   <div className={styles.handle} aria-hidden="true"/>
   <div className={styles.sheetHeader}>
    <h2 id="size-fit-title">Size &amp; fit</h2>
    <button className={styles.closeButton} type="button" onClick={()=>setOpen(false)} aria-label="Close size and fit">×</button>
   </div>
   <div className={styles.tabs} role="tablist" aria-label="Size and fit sections">
    {hasMeasurements&&<button type="button" role="tab" aria-selected={tab==='chart'} className={tab==='chart'?styles.activeTab:''} onClick={()=>setTab('chart')}>Size chart</button>}
    {hasFitContent&&<button type="button" role="tab" aria-selected={tab==='fit'} className={tab==='fit'?styles.activeTab:''} onClick={()=>setTab('fit')}>Fit</button>}
    {canMeasure&&<button type="button" role="tab" aria-selected={tab==='measure'} className={tab==='measure'?styles.activeTab:''} onClick={()=>setTab('measure')}>How to measure</button>}
   </div>
   <div className={styles.sheetBody}>
    {tab==='chart'&&hasMeasurements&&<div className={styles.chartPanel}>
     <div className={styles.chartTopline}>
      <div><p className={styles.eyebrow}>Garment measurements</p><p className={styles.chartIntro}>Compare with a similar garment you already own.</p></div>
      {canConvert&&<div className={styles.unitToggle} role="group" aria-label="Measurement unit"><button type="button" aria-pressed={unit==='cm'} onClick={()=>setUnit('cm')}>CM</button><button type="button" aria-pressed={unit==='inches'} onClick={()=>setUnit('inches')}>IN</button></div>}
     </div>
     <div className={`${styles.tableWrap}${scrollTable?` ${styles.tableScroll}`:''}`} tabIndex={scrollTable?0:undefined} aria-label={scrollTable?'Scrollable garment measurements':undefined}>
      <table className={styles.table}>
       <caption>Garment measurements{displayUnit?` · ${displayUnit==='inches'?'IN':displayUnit.toUpperCase()}`:''}</caption>
       <thead><tr><th scope="col">Size</th>{columns.map(field=><th scope="col" key={field}>{measurementLabel(field)}</th>)}</tr></thead>
       <tbody>{sizes.filter(size=>measurements[size]&&typeof measurements[size]==='object').map(size=><tr key={size}><th scope="row">{size}</th>{columns.map(field=><td key={field}>{formatMeasurementDisplay(canConvert?convertMeasurementValue(measurements[size]?.[field],unit):measurements[size]?.[field])}</td>)}</tr>)}</tbody>
      </table>
     </div>
     <p className={styles.measurementNote}>{fullCircumference?'Chest, waist, hip, thigh and leg opening are shown as full garment circumference where applicable.':'Compare the chart with a similar garment you own before choosing a size.'}</p>
     <StylistButton className={styles.stylistButton} mode="size" product={{title:product.title,handle:product.handle,selectedOptions}}><span>Find my size with AX</span><Icon name="arrow"/></StylistButton>
    </div>}
    {tab==='fit'&&hasFitContent&&<div className={styles.fitPanel}>
      <p className={styles.eyebrow}>Fit guidance</p>
      <div className={styles.fitNotes}>
       {product.fit&&<p><strong>Fit</strong><span>{product.fit}</span></p>}
       {(product.modelHeight||product.modelSize)&&<p><strong>Model</strong><span>{[product.modelHeight&&`Height ${product.modelHeight}`,product.modelSize&&`Wears ${product.modelSize}`].filter(Boolean).join(' · ')}</span></p>}
       {sizes.filter(size=>product.sizeFits?.[size]?.text).map(size=><p key={size}><strong>{size}</strong><span>{product.sizeFits[size].text}</span></p>)}
      </div>
      <StylistButton className={styles.stylistButton} mode="size" product={{title:product.title,handle:product.handle,selectedOptions}}><span>Find my size with AX</span><Icon name="arrow"/></StylistButton>
    </div>}
    {tab==='measure'&&canMeasure&&<div className={styles.measurePanel}>
     <div className={styles.measureHeading}><p className={styles.measureTitle}>{guide.title}</p><p>{guide.sub}</p></div>
     <div className={styles.diagramCard}><MeasurementIllustration category={category}/><p>{guide.note}</p></div>
     <div className={styles.steps} aria-label="Measurement steps"><span><b>1</b>Lay garment flat</span><span><b>2</b>Do not stretch</span><span><b>3</b>Use cm</span></div>
    </div>}
   </div>
  </section>
 </div>:null;

 return <>
  {inline
    ? <button type="button" className={styles.inlineTrigger} onClick={launch} aria-haspopup="dialog">{hasMeasurements?'Size chart':'Fit guide'} <span aria-hidden="true">›</span></button>
    : <button type="button" className={styles.trigger} onClick={launch} aria-haspopup="dialog">
       <span><strong>Size &amp; fit</strong><small>{hasMeasurements?'Size chart · Find my size':'Find my size with AX'}</small></span><span className={styles.triggerIcon}>+</span>
      </button>}
  {sheet&&createPortal(sheet,document.body)}
 </>;
}
