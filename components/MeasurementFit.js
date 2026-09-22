'use client';
import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {StylistButton} from './StylistProvider';
import Icon from './Icon';
import MeasurementIllustration from './MeasurementIllustrations';
import {GUIDE_KINDS,measurementGuideKind,measurementInstruction} from '../lib/measurement-guide';
import styles from './MeasurementFit.module.css';
import {trackStoreEvent} from '../lib/store-analytics';
import {canonicalMeasurementField,convertMeasurementValue,formatMeasurementDisplay,measurementCategory,measurementFieldsForProduct,measurementLabel,normalizeMeasurementRows} from '../lib/measurements';


function sizeOrder(product,measurements,fits){const optionValues=product.options?.find(option=>/size/i.test(option.name))?.values||[];return [...new Set([...optionValues,...Object.keys(measurements||{}),...Object.keys(fits||{})])];}
function observedColumns(measurements){const columns=[];Object.values(measurements||{}).forEach(row=>{if(!row||typeof row!=='object'||Array.isArray(row))return;Object.keys(row).forEach(raw=>{const key=canonicalMeasurementField(raw);if(!columns.includes(key))columns.push(key);});});return columns;}
function hasValue(value){return value!==undefined&&value!==null&&value!=='';}

export default function MeasurementFit({product,selectedOptions={},inline=false}){
 const [activeField,setActiveField]=useState('');
 const [unit,setUnit]=useState('cm');
 const [open,setOpen]=useState(false);
 const [tab,setTab]=useState('chart');
 const [mounted,setMounted]=useState(false);
 const category=measurementCategory(product);
 const normalized=useMemo(()=>normalizeMeasurementRows(product.sizeMeasurements||{},{unit:product.measurementUnit,basis:product.measurementBasis,category}),[product.sizeMeasurements,product.measurementUnit,product.measurementBasis,category]);
 const measurements=normalized.rows||{};
 const sizes=sizeOrder(product,measurements,product.sizeFits||{});
 const preferred=measurementFieldsForProduct(product),observed=observedColumns(measurements);
 const columns=[...new Set([...preferred,...observed])].filter(field=>sizes.some(size=>hasValue(measurements[size]?.[field])));
 const hasMeasurements=columns.length>0&&sizes.some(size=>measurements[size]&&typeof measurements[size]==='object');
 const hasNotes=sizes.some(size=>product.sizeFits?.[size]?.text);
 const hasFitContent=Boolean(product.fit||hasNotes||product.modelHeight||product.modelSize);
 const kind=measurementGuideKind(product),guide=GUIDE_KINDS[kind];
 const canMeasure=Boolean(guide);
 const fields=columns.length?columns:(guide?.fields||[]);
 const field=fields.includes(activeField)?activeField:fields[0];
 const isBodyChart=/body/i.test(product.measurementBasis||'');
 const chartTitle=isBodyChart?'Body measurements':'Garment measurements';
 const canConvert=normalized.unit==='cm',displayUnit=canConvert?unit:normalized.unit||product.measurementUnit||'';
 const fullCircumference=normalized.basis==='circumference';
 const scrollTable=columns.length>4;


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
  setTab('chart');
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
    <button type="button" role="tab" aria-selected={tab==='chart'} className={tab==='chart'?styles.activeTab:''} onClick={()=>setTab('chart')}>Size chart</button>
    {hasFitContent&&<button type="button" role="tab" aria-selected={tab==='fit'} className={tab==='fit'?styles.activeTab:''} onClick={()=>setTab('fit')}>Fit</button>}
    {canMeasure&&<button type="button" role="tab" aria-selected={tab==='measure'} className={tab==='measure'?styles.activeTab:''} onClick={()=>setTab('measure')}>How to measure</button>}
   </div>
   <div className={styles.sheetBody}>
    {tab==='chart'&&hasMeasurements&&<div className={styles.chartPanel}>
     <div className={styles.chartTopline}>
      <div><p className={styles.eyebrow}>{chartTitle}</p><p className={styles.chartIntro}>{isBodyChart?'These are labelled as body measurements. Do not compare them directly with flat garment widths.':'Compare with a similar garment you already own.'}</p></div>
      {canConvert&&<div className={styles.unitToggle} role="group" aria-label="Measurement unit"><button type="button" aria-pressed={unit==='cm'} onClick={()=>setUnit('cm')}>CM</button><button type="button" aria-pressed={unit==='inches'} onClick={()=>setUnit('inches')}>IN</button></div>}
     </div>
     <div className={`${styles.tableWrap}${scrollTable?` ${styles.tableScroll}`:''}`} tabIndex={scrollTable?0:undefined} aria-label={scrollTable?'Scrollable garment measurements':undefined}>
      <table className={styles.table}>
       <caption>{chartTitle}{displayUnit?` · ${displayUnit==='inches'?'IN':displayUnit.toUpperCase()}`:''}</caption>
       <thead><tr><th scope="col">Size</th>{columns.map(field=><th scope="col" key={field}>{measurementLabel(field)}</th>)}</tr></thead>
       <tbody>{sizes.filter(size=>measurements[size]&&typeof measurements[size]==='object').map(size=><tr key={size}><th scope="row">{size}</th>{columns.map(field=><td key={field}>{formatMeasurementDisplay(canConvert?convertMeasurementValue(measurements[size]?.[field],unit):measurements[size]?.[field])}</td>)}</tr>)}</tbody>
      </table>
     </div>
     <p className={styles.measurementNote}>{isBodyChart?'This chart is labelled as body measurements. Confirm the measuring method with AX before using the item guide below.':fullCircumference?'Chest, waist, hip, thigh, knee and leg opening are full garment circumferences where present. These chart values are already doubled; never double them again.':normalized.basis==='flat'?'Widths are flat measurements. Do not double them.':'Measurement basis is unconfirmed. Ask AX before converting widths to circumferences.'}</p>
     <StylistButton className={styles.stylistButton} mode="size" product={{title:product.title,handle:product.handle,selectedOptions}}><span>Find my size with AX</span><Icon name="arrow"/></StylistButton>
    </div>}
    {tab==='chart'&&!hasMeasurements&&<div className={styles.emptyChart}><p className={styles.eyebrow}>Measurements coming soon</p><p>We don’t have verified measurements for this item yet. Ask AX for help before choosing your size.</p><StylistButton className={styles.stylistButton} mode="size" product={{title:product.title,handle:product.handle,selectedOptions}}><span>Ask AX about sizing</span><Icon name="arrow"/></StylistButton></div>}
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
     <div className={styles.measureHeading}><p className={styles.measureTitle}>{guide.name} · How to measure</p><p>Compare a similar item you own. Lay it flat without stretching.</p></div>
     <div className={styles.measureLayout}>
      <div className={styles.diagramCard}>
       <MeasurementIllustration category={kind} fields={fields} field={field} label={guide.name}/>
       <p>Front view · Select a measurement to highlight it</p>
      </div>
      <ol className={styles.measureList} aria-label="Measurement instructions">
       {fields.map((item,index)=>{const instruction=measurementInstruction(item,isBodyChart?'':normalized.basis);return <li key={item}>
        <button type="button" aria-pressed={field===item} onClick={()=>setActiveField(item)}>
         <span className={styles.letter}>{String.fromCharCode(65+index)}</span><strong>{instruction.label}</strong><span className={styles.factor}>{instruction.factor}</span>
        </button>
        <p>{instruction.text}</p><small>{instruction.note}</small>
        {Object.values(measurements).some(row=>Array.isArray(row?.[item]))&&<small>Several values are stored here. Ask AX whether these represent a range or different measuring positions.</small>}
       </li>})}
      </ol>
     </div>
     <p className={styles.measurementNote}>{hasMeasurements?'Only fields present in this product’s size chart are shown.':'This is a measuring guide. Product measurements have not been supplied yet.'} Measure in {displayUnit||'the unit specified by AX'}; use the same unit as the chart. These are item measurements, not body measurements.</p>

    </div>}
   </div>
  </section>
 </div>:null;

 return <>
  {inline
    ? <button type="button" className={styles.inlineTrigger} onClick={launch} aria-haspopup="dialog">Size chart <span aria-hidden="true">›</span></button>
    : <button type="button" className={styles.trigger} onClick={launch} aria-haspopup="dialog">
       <span><strong>Size &amp; fit</strong><small>{hasMeasurements?'Size chart · Find my size':'Find my size with AX'}</small></span><span className={styles.triggerIcon}>+</span>
      </button>}
  {sheet&&createPortal(sheet,document.body)}
 </>;
}
