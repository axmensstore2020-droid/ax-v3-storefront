import Link from 'next/link';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {customerAccountConfig,CUSTOMER_ACCOUNT_SESSION_COOKIE,queryCustomerAccount,readAccountSessionToken,sessionExpired} from '../../lib/customer-account.js';

export const dynamic='force-dynamic';
export const metadata={title:'Your AX account'};

const customerQuery=`query CustomerAccount { customer { firstName lastName } }`;
const statusCopy={cancelled:'Sign-in was cancelled. You can try again whenever you’re ready.',invalid:'That sign-in link has expired. Please start again.',error:'We couldn’t complete sign-in right now. Please try again.',expired:'Your session expired. Please sign in again.',signin:'Please sign in to continue.',unavailable:'Customer accounts are being connected to the AX storefront. Please try again soon.'};

function ShopifyAccountLink({domain}) { return domain ? <a className="underlined-link" href={`https://${domain}/account`}>OPEN SHOPIFY ACCOUNT <span aria-hidden="true">↗</span></a> : null; }

export default async function AccountPage({searchParams}) {
  const config=customerAccountConfig(),params=await searchParams,status=typeof params?.status==='string'?params.status:'';
  if(!config.enabled) return <main id="main-content" className="account-page"><Link className="info-back" href="/">AX / ACCOUNT</Link><header className="info-heading"><p className="eyebrow">YOUR AX</p><h1 className="editorial">Make yourself at home.</h1><p>Sign-in is currently handled by Shopify while the custom AX account is being connected.</p></header><ShopifyAccountLink domain={config.domain}/></main>;
  const cookieStore=await cookies(),session=readAccountSessionToken(cookieStore.get(CUSTOMER_ACCOUNT_SESSION_COOKIE)?.value || '',config);
  if(session && sessionExpired(session)) redirect('/account/refresh?returnTo=%2Faccount');
  let customer=null;
  if(session) { try { customer=(await queryCustomerAccount(config,session,customerQuery)).data?.customer || null; } catch {} }
  return <main id="main-content" className="account-page"><Link className="info-back" href="/">AX / ACCOUNT</Link><header className="info-heading"><p className="eyebrow">YOUR AX</p><h1 className="editorial">Make yourself at home.</h1><p>{customer ? `Welcome back${customer.firstName ? `, ${customer.firstName}` : ''}. Your AX account is connected to this storefront.` : 'Sign in or create an account to keep your orders and account access close to the AX experience.'}</p></header>{status && <p className="account-notice" role="status">{statusCopy[status] || statusCopy.error}</p>}{customer ? <section className="account-card" aria-label="Account actions"><p className="eyebrow">ACCOUNT</p><h2 className="editorial">Welcome{customer.firstName ? `, ${customer.firstName}` : ''}.</h2><p className="muted">Your customer account is managed securely by Shopify. We’ll keep building the AX account experience here.</p><div className="account-actions"><Link className="solid-button" href="/products">EXPLORE AX <span aria-hidden="true">→</span></Link><form action="/account/logout" method="post"><button className="underlined-link" type="submit">SIGN OUT <span aria-hidden="true">→</span></button></form></div></section> : <a className="solid-button" href="/account/login?returnTo=%2Faccount">SIGN IN / CREATE ACCOUNT <span aria-hidden="true">→</span></a>}</main>;
}
