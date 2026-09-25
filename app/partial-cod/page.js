import Link from 'next/link';
import PartialCodCheckout from '../../components/PartialCodCheckout';
import {partialCodConfigured} from '../../lib/partial-cod-server';

export const metadata={
 title:'Partial COD',
 description:'Pay 20% of the final order value securely and pay the remaining 80% to our delivery partner on delivery.'
};

export default function PartialCodPage(){
 const enabled=partialCodConfigured();
 return <main id="main-content" className="partial-cod-page">
  {enabled?<PartialCodCheckout/>:<section className="partial-cod-unavailable">
   <p className="eyebrow">PARTIAL COD</p>
   <h1 className="editorial">Partial COD is not available yet.</h1>
   <p>The payment option is kept off until payment verification, order creation and delivery-partner COD booking are fully configured and tested.</p>
   <Link className="solid-button" href="/products">CONTINUE SHOPPING</Link>
  </section>}
 </main>;
}
