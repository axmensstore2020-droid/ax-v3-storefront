'use client';
import {useMemo,useState} from 'react';
import {StylistButton} from './StylistProvider';
import Icon from './Icon';
import MeasurementIllustration from './MeasurementIllustrations';
import styles from './MeasurementFit.module.css';
import {canonicalMeasurementField,convertMeasurementValue,formatMeasurementDisplay,measurementCategory,measurementFieldsForProduct,measurementLabel,measurementMarkers,normalizeMeasurementRows} from '../lib/measurements';

const descriptions={
 chest:'Across the fullest part of the chest',
 shoulder:'From shoulder point to shoulder point',
 length:'From highest shoulder point to hem',
 front_length:'From highest shoulder point to front hem',
 sleeve:'From shoulder point to sleeve hem',
 waist:'Around the garment waist',
 hip:'Around the fullest hip area',
 front_rise:'From crotch seam to top waistband',
 thigh:'Around the upper thigh',
 inseam:'From crotch seam to hem',
 outseam:'From top waistband to hem',
 leg_opening:'Around the hem opening'
};

function sizeOrder(product,measurements,fits){const optionValues=product.options?.find(option=>/size/i.test(option.name))?.values||[];return [...new Set([...optionValues,...Object.keys(measurements||{}),...Object.keys(fits||{})])];}
function observedColumns(measurements){const columns=[];Object.values(measurements||{}).forEach(row=>{if(!row||typeof row!=='object'||Array.isArray(row))return;Object.keys(row).forEach(raw=>{const key=canonicalMeasurementField(raw);if(!columns.includes(key))columns.push(key);});});return columns;}
function hasValue(value){return value!==undefined&&value!==null&&value!=='';}

export default function MeasurementFit({product,selectedOptions={}}){
 const [unit,setUnit]=useState('cm');
 const category=measurementCategory(product);
 const normalized=useMemo(()=>normalizeMeasurementRows(product.sizeMeasurements||{},{unit:product.measurementUnit,basis:product.measurementBasis,category}),[product.sizeMeasurements,product.measurementUnit,product.measurementBasis,category]);
 const measurements=normalized.rows||{};
 const sizes=sizeOrder(product,measurements,product.sizeFits||{});
 const preferred=measurementFieldsForProduct(product),observed=observedColumns(measurements);
 const columns=(preferred.length?preferred:observed).filter(field=>sizes.some(size=>hasValue(measurements[size]?.[field])));
 const hasMeasurements=columns.length>0&&sizes.some(size=>measurements[size]&&typeof measurements[size]==='object');
 const hasNotes=sizes.some(size=>product.sizeFits?.[size]?.text);
 const markers=measurementMarkers(product).filter(item=>columns.includes(item.field));
 const markerByField=Object.fromEntries(markers.map(item=>[item.field,item.marker]));
 const canConvert=normalized.unit==='cm',displayUnit=canConvert?unit:normalized.unit||product.measurementUnit||'';
 const fullCircumference=normalized.basis==='circumference';
 if(!hasMeasurements&&!hasNotes&&!product.fit)return null;
 const scrollTable=columns.length>4;
 return <details className={styles.panel}>
  <summary className={styles.summary}><span>Measurements &amp; fit</span><span className={styles.summaryHint}>Size guide</span></summary>
  <div className={styles.body}>
   <div className={styles.topline}>
    <div>{product.fit&&<span className={styles.fitBadge}>{product.fit} fit</span>}<p className={styles.fitSummary}>Compare with a garment you already wear for best accuracy.</p></div>
    {hasMeasurements&&canConvert&&<div className={styles.unitToggle} role="group" aria-label="Measurement unit"><button type="button" aria-pressed={unit==='cm'} onClick={()=>setUnit('cm')}>CM</button><button type="button" aria-pressed={unit==='inches'} onClick={()=>setUnit('inches')}>IN</button></div>}
   </div>
   {hasMeasurements&&<>
    <div className={`${styles.tableWrap}${scrollTable?` ${styles.tableScroll}`:''}`} tabIndex={scrollTable?0:undefined} aria-label={scrollTable?'Scrollable garment measurements':undefined}>
     <table className={styles.table}>
      <caption>Garment measurements{displayUnit?` · ${displayUnit==='inches'?'IN':displayUnit.toUpperCase()}`:''}</caption>
      <thead><tr><th scope="col">Size</th>{columns.map(field=><th scope="col" key={field}>{measurementLabel(field)}</th>)}</tr></thead>
      <tbody>{sizes.filter(size=>measurements[size]&&typeof measurements[size]==='object').map(size=><tr key={size}><th scope="row">{size}</th>{columns.map(field=><td key={field}>{formatMeasurementDisplay(canConvert?convertMeasurementValue(measurements[size]?.[field],unit):measurements[size]?.[field])}</td>)}</tr>)}</tbody>
     </table>
    </div>
    <p className={styles.measurementNote}>{fullCircumference?'Chest, waist, hip, thigh and leg opening are shown as full garment circumference.':'Compare the chart with a similar garment you own before choosing a size.'}</p>
    {category&&<div className={styles.guideCard}>
     <div className={styles.diagram}><MeasurementIllustration category={category}/></div>
     {markers.length>0&&<ul className={styles.legend} aria-label="Measurement guide">{markers.map(item=><li key={item.field}><span className={styles.marker}>{item.marker}</span><span><strong>{item.label}</strong><small>{descriptions[item.field]||''}</small></span></li>)}</ul>}
    </div>}
   </>}
   <details className={styles.howTo}>
    <summary>How to measure</summary>
    <ol><li>Use a similar garment you already own.</li><li>Lay it flat and smooth out any wrinkles.</li><li>Measure the points shown in the illustration.</li><li>Compare the result with the chart above.</li></ol>
   </details>
   {hasNotes&&<div className={styles.notes} aria-label="Size fit notes">{sizes.filter(size=>product.sizeFits?.[size]?.text).map(size=><p key={size}><strong>{size}</strong><span>{product.sizeFits[size].text}</span></p>)}</div>}
   <StylistButton className={styles.stylistButton} mode="size" product={{title:product.title,handle:product.handle,selectedOptions}}><span>Find my size with AX</span><Icon name="arrow"/></StylistButton>
  </div>
 </details>;
}
