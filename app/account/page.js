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
  let customer=null,accountError=false;
  if(session) { try { customer=(await queryCustomerAccount(config,session,customerQuery)).data?.customer || null; } catch { accountError=true; } }
  const intro=customer ? `Welcome back${customer.firstName ? `, ${customer.firstName}` : ''}. Your AX account is connected to this storefront.` : session ? 'You’re signed in with Shopify. AX is having trouble loading your account details right now.' : 'Sign in or create an account to keep your orders and account access close to the AX experience.';
  return <main id="main-content" className="account-page"><Link className="info-back" href="/">AX / ACCOUNT</Link><header className="info-heading"><p className="eyebrow">YOUR AX</p><h1 className="editorial">Make yourself at home.</h1><p>{intro}</p></header>{status && <p className="account-notice" role="status">{statusCopy[status] || statusCopy.error}</p>}{accountError && <p className="account-notice" role="status">Shopify sign-in completed, but AX couldn’t load your account details. Refresh this page once. If it continues, sign out and try again.</p>}{customer ? <section className="account-card" aria-label="Account actions"><p className="eyebrow">ACCOUNT</p><h2 className="editorial">Welcome{customer.firstName ? `, ${customer.firstName}` : ''}.</h2><p className="muted">Your customer account is managed securely by Shopify. We’ll keep building the AX account experience here.</p><div className="account-actions"><Link className="solid-button" href="/products">EXPLORE AX <span aria-hidden="true">→</span></Link><form action="/account/logout" method="post"><button className="underlined-link" type="submit">SIGN OUT <span aria-hidden="true">→</span></button></form></div></section> : session ? <section className="account-card" aria-label="Account status"><p className="eyebrow">SIGNED IN</p><h2 className="editorial">Your Shopify session is active.</h2><p className="muted">AX couldn’t read the account profile yet. Your sign-in itself completed.</p><div className="account-actions"><Link className="solid-button" href="/account">RETRY ACCOUNT <span aria-hidden="true">→</span></Link><form action="/account/logout" method="post"><button className="underlined-link" type="submit">SIGN OUT <span aria-hidden="true">→</span></button></form></div></section> : <a className="solid-button" href="/account/login?returnTo=%2Faccount">SIGN IN / CREATE ACCOUNT <span aria-hidden="true">→</span></a>}</main>;
}
