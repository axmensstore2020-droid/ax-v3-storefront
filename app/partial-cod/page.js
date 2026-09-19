import Link from 'next/link';
import PartialCodCheckout from '../../components/PartialCodCheckout';
import {partialCodConfigured} from '../../lib/partial-cod-server';

export const metadata={
 title:'Partial COD',
 description:'Pay a booking advance securely and pay the remaining eligible order balance to Delhivery on delivery.'
};

export default function PartialCodPage(){
 const enabled=partialCodConfigured();
 return <main id="main-content" className="partial-cod-page">
  {enabled?<PartialCodCheckout/>:<section className="partial-cod-unavailable">
   <p className="eyebrow">PARTIAL COD</p>
   <h1 className="editorial">Partial COD is not available yet.</h1>
   <p>The payment option is kept off until Razorpay verification, Shopify order creation and Delhivery COD booking are fully configured and tested.</p>
   <Link className="solid-button" href="/products">CONTINUE SHOPPING</Link>
  </section>}
 </main>;
}
