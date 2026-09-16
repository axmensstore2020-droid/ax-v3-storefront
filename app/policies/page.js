import InfoPage from '../../components/InfoPage';
import RichContent from '../../components/RichContent';
import {getPolicies} from '../../lib/content';
import {contactEmail,contactHref} from '../../lib/store-info';
export const metadata={title:'Policies'};

function ServiceProviders() {
 return <section id="service-providers" className="policy-section">
  <h2>Service providers and third-party processing</h2>
  <p>AX Store uses trusted third-party service providers to operate the store, provide AX Stylist, process payments, measure optional marketing, manage customer accounts, host infrastructure, and support shipping and fulfilment. We share information with them only as needed for those services and subject to their applicable terms, privacy practices and our agreements with them.</p>
  <ul>
   <li><strong>Shopify</strong> — commerce infrastructure, product catalogue, shopping bag, checkout, customer accounts and order processing.</li>
   <li><strong>OpenAI</strong> — AI processing for AX Stylist, including messages, relevant shopping or fit context and, when photo styling is enabled and you choose to submit one, the selected clothing image.</li>
   <li><strong>Supabase</strong> — private storage for optional AX Stylist measurements and style preferences that you choose to save, together with limited service-usage records used for security and abuse prevention.</li>
   <li><strong>Hostinger</strong> — hosting and infrastructure for the AX Store application and related operational logs.</li>
   <li><strong>Meta Platforms</strong> — advertising measurement, campaign attribution and product advertising when you accept optional marketing cookies. AX may send standard commerce events such as page views, product views, items added to bag and checkout starts. AX does not send AX Stylist chats, submitted photos, body measurements or saved fit/profile details to Meta.</li>
   <li><strong>Razorpay</strong> — payment processing where that payment method is offered through checkout. AX Stylist does not receive your card number, CVV, UPI PIN or banking credentials.</li>
   <li><strong>Delhivery</strong> — shipping, delivery, fulfilment and tracking-related processing where used for an order.</li>
  </ul>
  <p>Optional marketing tracking is disabled until you accept the marketing-cookie choice presented by AX. You can reopen Cookie choices from the footer and change that preference. Essential store functions remain available if you decline optional marketing cookies.</p>
  <p>For AX Stylist, chat transcripts and submitted photos are not saved to AX’s profile database. Optional saved fit/profile information is retained for up to 30 days under the current AX Stylist settings. Some providers may independently retain limited operational, security or abuse-prevention data according to their own policies and our service configuration.</p>
  <p>Our provider list may change as the Services evolve. We will update this disclosure when a change materially affects how personal information is processed.</p>
 </section>;
}

export default async function PoliciesPage() {
 const policies=await getPolicies();
 return <InfoPage eyebrow="HERE TO HELP" title="Our policies." intro="Delivery, returns and the details. Together in one place.">
  {policies.length?<>
   <nav className="policy-index" aria-label="Policy contents">{policies.map(policy=><a key={policy.key} href={`#${policy.key}`}>{policy.title}</a>)}<a href="#service-providers">Service providers</a></nav>
   {policies.map(policy=><section key={policy.key} id={policy.key} className="policy-section"><h2>{policy.title}</h2>{policy.body?<RichContent html={policy.body}/>:policy.url?<a className="underlined-link" href={policy.url} target="_blank" rel="noopener noreferrer">READ {policy.title.toUpperCase()} ↗</a>:null}</section>)}
  </>:<p>We couldn’t load the policies at the moment. Please email <a className="text-link" href={contactHref}>{contactEmail}</a> for the current terms before placing an order.</p>}
  <ServiceProviders/>
 </InfoPage>;
}