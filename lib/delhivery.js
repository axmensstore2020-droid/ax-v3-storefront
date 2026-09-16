import 'server-only';

const TRACKING_ENDPOINT='https://track.delhivery.com/api/v1/packages/json/';
const MAX_WAYBILLS=50;

const text=value=>value == null ? '' : String(value).trim();

export function normalizeWaybill(value) {
  const waybill=text(value);
  return /^[A-Za-z0-9-]{6,40}$/.test(waybill) ? waybill : '';
}

function normalizeScan(value) {
  const scan=value?.ScanDetail || value?.scanDetail || value || {};
  return {
    status:text(scan.Scan || scan.Status || scan.ScanType || scan.status),
    location:text(scan.ScannedLocation || scan.StatusLocation || scan.location),
    happenedAt:text(scan.ScanDateTime || scan.StatusDateTime || scan.happenedAt),
    instructions:text(scan.Instructions || scan.instructions),
    statusCode:text(scan.StatusCode || scan.statusCode)
  };
}

function normalizeShipment(value) {
  const shipment=value?.Shipment || value?.shipment || value || {};
  const status=shipment.Status && typeof shipment.Status==='object' ? shipment.Status : {};
  const waybill=normalizeWaybill(shipment.AWB || shipment.Waybill || shipment.waybill || shipment.TrackingNumber);
  if(!waybill) return null;
  const scans=Array.isArray(shipment.Scans) ? shipment.Scans.map(normalizeScan).filter(scan=>scan.status || scan.happenedAt || scan.location) : [];
  return {
    waybill,
    status:text(status.Status || status.status || shipment.StatusText || shipment.status),
    statusCode:text(status.StatusCode || status.statusCode),
    location:text(status.StatusLocation || status.Location || status.location),
    updatedAt:text(status.StatusDateTime || status.statusDateTime || shipment.LastUpdatedAt),
    expectedDeliveryAt:text(shipment.ExpectedDeliveryDate || shipment.expectedDeliveryDate || shipment.EDD),
    destination:text(shipment.Destination || shipment.destination),
    origin:text(shipment.Origin || shipment.origin),
    scans
  };
}

export function normalizeDelhiveryResponse(payload) {
  const rows=Array.isArray(payload?.ShipmentData) ? payload.ShipmentData : [];
  return Object.fromEntries(rows.map(normalizeShipment).filter(Boolean).map(shipment=>[shipment.waybill,shipment]));
}

export function delhiveryConfigured(env=process.env) {
  return Boolean(text(env.DELHIVERY_API_TOKEN));
}

export async function trackDelhiveryWaybills(values,{env=process.env,fetchImpl=fetch}={}) {
  const token=text(env.DELHIVERY_API_TOKEN);
  const waybills=[...new Set((Array.isArray(values)?values:[]).map(normalizeWaybill).filter(Boolean))].slice(0,MAX_WAYBILLS);
  if(!token || !waybills.length) return {configured:Boolean(token),shipments:{},error:''};
  const url=new URL(TRACKING_ENDPOINT);
  url.searchParams.set('waybill',waybills.join(','));
  url.searchParams.set('ref_ids','');
  try {
    const response=await fetchImpl(url,{method:'GET',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Token ${token}`,'User-Agent':'AX-Mens-Store/1.0'},cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!response.ok) return {configured:true,shipments:{},error:'Delhivery tracking is temporarily unavailable.'};
    let payload;
    try { payload=await response.json(); } catch { return {configured:true,shipments:{},error:'Delhivery tracking is temporarily unavailable.'}; }
    return {configured:true,shipments:normalizeDelhiveryResponse(payload),error:''};
  } catch {
    return {configured:true,shipments:{},error:'Delhivery tracking is temporarily unavailable.'};
  }
}
