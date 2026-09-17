'use client';
import {useMemo,useState} from 'react';
import {StylistButton} from './StylistProvider';
import Icon from './Icon';
import MeasurementIllustration from './MeasurementIllustrations';
import styles from './MeasurementFit.module.css';
import {canonicalMeasurementField,convertMeasurementValue,formatMeasurementDisplay,measurementCategory,measurementFieldsForProduct,measurementLabel,measurementMarkers,normalizeMeasurementRows} from '../lib/measurements';

function sizeOrder(product, measurements, fits) {
  const optionValues = product.options?.find(option => /size/i.test(option.name))?.values || [];
  return [...new Set([...optionValues,...Object.keys(measurements || {}),...Object.keys(fits || {})])];
}
function observedColumns(measurements) {
  const columns=[];
  Object.values(measurements || {}).forEach(row=>{
    if (!row || typeof row !== 'object' || Array.isArray(row)) return;
    Object.keys(row).forEach(raw=>{const key=canonicalMeasurementField(raw);if(!columns.includes(key))columns.push(key);});
  });
  return columns;
}
function hasValue(value) { return value !== undefined && value !== null && value !== ''; }

export default function MeasurementFit({product,selectedOptions={}}) {
  const [unit,setUnit]=useState('cm');
  const category=measurementCategory(product);
  const normalized=useMemo(()=>normalizeMeasurementRows(product.sizeMeasurements || {},{unit:product.measurementUnit,basis:product.measurementBasis,category}),[product.sizeMeasurements,product.measurementUnit,product.measurementBasis,category]);
  const measurements=normalized.rows || {};
  const sizes=sizeOrder(product,measurements,product.sizeFits || {});
  const preferred=measurementFieldsForProduct(product);
  const observed=observedColumns(measurements);
  const columns=(preferred.length ? preferred : observed).filter(field=>sizes.some(size=>hasValue(measurements[size]?.[field])));
  const hasMeasurements=columns.length>0 && sizes.some(size=>measurements[size] && typeof measurements[size]==='object');
  const hasNotes=sizes.some(size=>product.sizeFits?.[size]?.text);
  const markers=measurementMarkers(product).filter(item=>columns.includes(item.field));
  const markerByField=Object.fromEntries(markers.map(item=>[item.field,item.marker]));
  const canConvert=normalized.unit === 'cm';
  const displayUnit=canConvert ? unit : normalized.unit || product.measurementUnit || '';
  const fullCircumference=normalized.basis === 'circumference';
  if (!hasMeasurements && !hasNotes && !product.fit) return null;

  return <details className={styles.panel} open>
    <summary className={styles.summary}>Measurements &amp; fit</summary>
    <div className={styles.intro}>
      <p className={styles.fitSummary}>{product.fit ? `This piece is ${product.fit.toLowerCase()}. ` : ''}Compare the garment chart with a piece you already like.</p>
      {hasMeasurements && canConvert && <div className={styles.unitToggle} role="group" aria-label="Measurement unit">
        <button type="button" aria-pressed={unit==='cm'} onClick={()=>setUnit('cm')}>CM</button>
        <button type="button" aria-pressed={unit==='inches'} onClick={()=>setUnit('inches')}>IN</button>
      </div>}
    </div>
    {hasMeasurements && <div className={styles.content}>
      <div>
        <div className={styles.tableWrap} tabIndex={0} aria-label="Scrollable garment measurements">
          <table className={styles.table}>
            <caption>Garment measurements{displayUnit ? ` · ${displayUnit === 'inches' ? 'IN' : displayUnit.toUpperCase()}` : ''}</caption>
            <thead><tr><th scope="col">Size</th>{columns.map(field=><th scope="col" key={field}>{markerByField[field] ? `${markerByField[field]} · ` : ''}{measurementLabel(field)}</th>)}</tr></thead>
            <tbody>{sizes.filter(size=>measurements[size] && typeof measurements[size]==='object').map(size=><tr key={size}><th scope="row">{size}</th>{columns.map(field=><td key={field}>{formatMeasurementDisplay(canConvert ? convertMeasurementValue(measurements[size]?.[field],unit) : measurements[size]?.[field])}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p className={styles.measurementNote}>{fullCircumference ? 'Chest, waist, hip, thigh and leg opening are full garment circumference measurements. Shoulder, length, sleeve, rise, inseam and outseam are measured linearly.' : 'Measurement basis is not standardized for this product yet. Confirm the chart with AX before relying on circumference values.'}</p>
      </div>
      {category && <div><div className={styles.diagram}><MeasurementIllustration category={category}/></div>{markers.length>0 && <ul className={styles.legend} aria-label="Measurement markers">{markers.map(item=><li key={item.field}><span className={styles.marker}>{item.marker}</span><span>{item.label}</span></li>)}</ul>}</div>}
    </div>}
    {hasNotes && <div className={styles.notes} aria-label="Size fit notes">{sizes.filter(size=>product.sizeFits?.[size]?.text).map(size=><p key={size}><strong>{size}</strong><span>{product.sizeFits[size].text}</span></p>)}</div>}
    <StylistButton className={styles.stylistButton} mode="size" product={{title:product.title,handle:product.handle,selectedOptions}}><span>Find my size with AX</span><Icon name="arrow"/></StylistButton>
  </details>;
}
