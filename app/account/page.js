import Link from 'next/link';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {customerAccountConfig,CUSTOMER_ACCOUNT_SESSION_COOKIE,queryCustomerAccount,readAccountSessionToken,sessionExpired} from '../../lib/customer-account.js';
import {trackDelhiveryWaybills} from '../../lib/delhivery.js';

export const dynamic='force-dynamic';
export const metadata={title:'Your AX account'};

const profileQuery=`query AXCustomerProfile { customer { firstName lastName } }`;
const ordersQuery=`query AXCustomerOrders {
  customer {
    orders(first: 10, reverse: true, sortKey: PROCESSED_AT) {
      nodes {
        id
        name
        processedAt
        financialStatus
        fulfillmentStatus
        statusPageUrl
        totalPrice { amount currencyCode }
        lineItems(first: 25) {
          nodes {
            id
            name
            quantity
            variantTitle
            image { url altText width height }
            currentTotalPrice { amount currencyCode }
          }
        }
        fulfillments(first: 10) {
          nodes {
            id
            status
            latestShipmentStatus
            estimatedDeliveryAt
            trackingInformation { company number url }
            events(first: 20, reverse: true) { nodes { id happenedAt status } }
          }
        }
      }
    }
  }
}`;
const statusCopy={cancelled:'Sign-in was cancelled. You can try again whenever you’re ready.',invalid:'That sign-in link has expired. Please start again.',error:'We couldn’t complete sign-in right now. Please try again.',expired:'Your session expired. Please sign in again.',signin:'Please sign in to continue.',unavailable:'Customer accounts are being connected to the AX storefront. Please try again soon.'};

function ShopifyAccountLink({domain}) { return domain ? <a className="underlined-link" href={`https://${domain}/account`}>OPEN SHOPIFY ACCOUNT <span aria-hidden="true">↗</span></a> : null; }
function label(value) { return String(value || '').toLowerCase().replaceAll('_',' ').replace(/^./,character=>character.toUpperCase()); }
function dateLabel(value) { if(!value) return '';try{return new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value));}catch{return String(value);} }
function dateTimeLabel(value) { if(!value) return '';try{return new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(new Date(value));}catch{return String(value);} }
function moneyLabel(value) {
  const amount=Number(value?.amount),currency=value?.currencyCode || 'INR';
  if(!Number.isFinite(amount)) return '';
  try { return new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:2}).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
}
function isDelhiveryTracking(info) { return /delhivery/i.test(`${info?.company || ''} ${info?.url || ''}`); }
function collectDelhiveryWaybills(orders) {
  return orders.flatMap(order=>order?.fulfillments?.nodes || []).flatMap(fulfillment=>fulfillment?.trackingInformation || []).filter(isDelhiveryTracking).map(info=>info.number).filter(Boolean);
}
function orderedTimeline(items) {
  return [...(items || [])].sort((a,b)=>{
    const aTime=Date.parse(a?.happenedAt || ''),bTime=Date.parse(b?.happenedAt || '');
    return (Number.isFinite(bTime)?bTime:0)-(Number.isFinite(aTime)?aTime:0);
  });
}

function Shipment({fulfillment,tracking,delhivery}) {
  const infos=fulfillment?.trackingInformation || [],shopifyEvents=orderedTimeline((fulfillment?.events?.nodes || []).map(event=>({status:label(event.status),happenedAt:event.happenedAt,location:''})));
  const fallbackStatus=label(fulfillment?.latestShipmentStatus || fulfillment?.status) || 'Processing';
  if(!infos.length) return <div className="account-shipment"><div className="account-shipment-head"><div><span className="account-kicker">SHIPMENT</span><strong>{fallbackStatus}</strong></div>{fulfillment?.estimatedDeliveryAt && <span>Estimated {dateLabel(fulfillment.estimatedDeliveryAt)}</span>}</div><p className="muted">Tracking will appear here when the shipment is assigned a tracking number.</p></div>;
  return <>{infos.map((info,index)=>{
    const waybill=String(info?.number || ''),live=isDelhiveryTracking(info) ? delhivery?.shipments?.[waybill] : null;
    const timeline=live?.scans?.length ? orderedTimeline(live.scans) : shopifyEvents;
    const shipmentStatus=live?.status || fallbackStatus;
    const estimated=live?.expectedDeliveryAt || fulfillment?.estimatedDeliveryAt;
    return <div className="account-shipment" key={`${waybill || fulfillment.id}-${index}`}>
      <div className="account-shipment-head"><div><span className="account-kicker">{live ? 'LIVE · DELHIVERY' : (info?.company || 'SHIPMENT').toUpperCase()}</span><strong>{shipmentStatus}</strong></div>{estimated && <span>Estimated {dateLabel(estimated)}</span>}</div>
      <div className="account-tracking-meta"><span>{waybill ? `AWB ${waybill}` : 'Tracking number pending'}</span>{live?.location && <span>{live.location}</span>}{info?.url && <a href={info.url} target="_blank" rel="noreferrer">CARRIER TRACKING ↗</a>}</div>
      {timeline.length>0 && <ol className="account-timeline">{timeline.slice(0,5).map((scan,scanIndex)=><li key={`${scan.happenedAt || scan.status}-${scanIndex}`}><span aria-hidden="true"/><div><strong>{scan.status || 'Shipment update'}</strong>{scan.location && <small>{scan.location}</small>}{scan.happenedAt && <small>{dateTimeLabel(scan.happenedAt)}</small>}</div></li>)}</ol>}
      {isDelhiveryTracking(info) && delhivery?.configured && !live && <p className="account-tracking-note">Live carrier detail is temporarily unavailable; Shopify tracking is shown instead.</p>}
    </div>;
  })}</>;
}

function OrderHistory({orders,ordersError,delhivery}) {
  return <section className="account-orders" aria-labelledby="order-history-title">
    <header className="account-orders-heading"><div><p className="eyebrow">YOUR PURCHASES</p><h2 className="editorial" id="order-history-title">Order history.</h2></div><span>{orders.length ? `${orders.length} RECENT ORDER${orders.length===1?'':'S'}` : ''}</span></header>
    {ordersError ? <div className="account-orders-empty"><p>Order history is temporarily unavailable.</p><p className="muted">Your Shopify account is still connected. AX can show orders once order access is enabled for this storefront.</p></div> : !orders.length ? <div className="account-orders-empty"><p>No orders yet.</p><p className="muted">When you place an order with this AX account, it will appear here.</p><Link className="underlined-link" href="/products">EXPLORE AX <span aria-hidden="true">→</span></Link></div> : <div className="account-order-list">{orders.map(order=><article className="account-order" key={order.id}>
      <header className="account-order-head"><div><span className="account-kicker">ORDER</span><h3>{order.name}</h3><p>{dateLabel(order.processedAt)}</p></div><div className="account-order-total"><span>TOTAL</span><strong>{moneyLabel(order.totalPrice)}</strong></div></header>
      <div className="account-order-status"><span>PAYMENT · {label(order.financialStatus) || '—'}</span><span>FULFILLMENT · {label(order.fulfillmentStatus) || '—'}</span>{order.statusPageUrl && <a href={order.statusPageUrl} target="_blank" rel="noreferrer">ORDER STATUS ↗</a>}</div>
      <div className="account-line-items">{(order?.lineItems?.nodes || []).map(item=><div className="account-line-item" key={item.id}>{item?.image?.url ? <img src={item.image.url} alt={item.image.altText || item.name || 'Ordered AX item'} width="72" height="96" loading="lazy"/> : <div className="account-line-image-placeholder" aria-hidden="true"/>}<div><strong>{item.name}</strong>{item.variantTitle && <span>{item.variantTitle}</span>}<span>QTY {item.quantity}</span></div><span>{moneyLabel(item.currentTotalPrice)}</span></div>)}</div>
      <div className="account-shipments">{(order?.fulfillments?.nodes || []).length ? (order.fulfillments.nodes.map(fulfillment=><Shipment key={fulfillment.id} fulfillment={fulfillment} delhivery={delhivery}/>)) : <div className="account-shipment"><span className="account-kicker">SHIPMENT</span><strong>{label(order.fulfillmentStatus) || 'Unfulfilled'}</strong><p className="muted">Tracking will appear after this order is fulfilled.</p></div>}</div>
    </article>)}</div>}
    {delhivery?.error && orders.length>0 && <p className="account-tracking-note">Live Delhivery updates are temporarily unavailable. Shopify order and tracking information is still shown.</p>}
  </section>;
}

export default async function AccountPage({searchParams}) {
  const config=customerAccountConfig(),params=await searchParams,status=typeof params?.status==='string'?params.status:'';
  if(!config.enabled) return <main id="main-content" className="account-page"><Link className="info-back" href="/">AX / ACCOUNT</Link><header className="info-heading"><p className="eyebrow">YOUR AX</p><h1 className="editorial">Make yourself at home.</h1><p>Sign-in is currently handled by Shopify while the custom AX account is being connected.</p></header><ShopifyAccountLink domain={config.domain}/></main>;
  const cookieStore=await cookies(),session=readAccountSessionToken(cookieStore.get(CUSTOMER_ACCOUNT_SESSION_COOKIE)?.value || '',config);
  if(session && sessionExpired(session)) redirect('/account/refresh?returnTo=%2Faccount');
  let customer=null,accountError=false,orders=[],ordersError=false,delhivery={configured:false,shipments:{},error:''};
  if(session) {
    try { customer=(await queryCustomerAccount(config,session,profileQuery)).data?.customer || null; } catch { accountError=true; }
    if(customer) {
      try { orders=(await queryCustomerAccount(config,session,ordersQuery)).data?.customer?.orders?.nodes || []; }
      catch { ordersError=true; }
      if(orders.length) delhivery=await trackDelhiveryWaybills(collectDelhiveryWaybills(orders));
    }
  }
  const intro=customer ? `Welcome back${customer.firstName ? `, ${customer.firstName}` : ''}. Your AX account is connected to this storefront.` : session ? 'You’re signed in with Shopify. AX is having trouble loading your account details right now.' : 'Sign in or create an account to keep your orders and account access close to the AX experience.';
  return <main id="main-content" className="account-page"><Link className="info-back" href="/">AX / ACCOUNT</Link><header className="info-heading"><p className="eyebrow">YOUR AX</p><h1 className="editorial">Make yourself at home.</h1><p>{intro}</p></header>{status && <p className="account-notice" role="status">{statusCopy[status] || statusCopy.error}</p>}{accountError && <p className="account-notice" role="status">Shopify sign-in completed, but AX couldn’t load your account details. Refresh this page once. If it continues, sign out and try again.</p>}{customer ? <><section className="account-card" aria-label="Account actions"><p className="eyebrow">ACCOUNT</p><h2 className="editorial">Welcome{customer.firstName ? `, ${customer.firstName}` : ''}.</h2><p className="muted">Your customer account is managed securely by Shopify. Orders and shipment updates stay here in the AX storefront.</p><div className="account-actions"><Link className="solid-button" href="/products">EXPLORE AX <span aria-hidden="true">→</span></Link><form action="/account/logout" method="post"><button className="underlined-link" type="submit">SIGN OUT <span aria-hidden="true">→</span></button></form></div></section><OrderHistory orders={orders} ordersError={ordersError} delhivery={delhivery}/></> : session ? <section className="account-card" aria-label="Account status"><p className="eyebrow">SIGNED IN</p><h2 className="editorial">Your Shopify session is active.</h2><p className="muted">AX couldn’t read the account profile yet. Your sign-in itself completed.</p><div className="account-actions"><Link className="solid-button" href="/account">RETRY ACCOUNT <span aria-hidden="true">→</span></Link><form action="/account/logout" method="post"><button className="underlined-link" type="submit">SIGN OUT <span aria-hidden="true">→</span></button></form></div></section> : <a className="solid-button" href="/account/login?returnTo=%2Faccount">SIGN IN / CREATE ACCOUNT <span aria-hidden="true">→</span></a>}</main>;
}
