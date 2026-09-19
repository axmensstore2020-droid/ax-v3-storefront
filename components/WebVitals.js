'use client';
import {useReportWebVitals} from 'next/web-vitals';
import {trackStoreEvent} from '../lib/store-analytics';

function report(metric){
 if(!['LCP','CLS','INP','FCP','TTFB'].includes(metric.name))return;
 trackStoreEvent('web_vital',{metadata:{name:metric.name,rating:metric.rating||'',value:Number(Number(metric.value||0).toFixed(4))}});
}
export default function WebVitals(){useReportWebVitals(report);return null;}
