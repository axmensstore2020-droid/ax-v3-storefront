import InfoPage from '../../components/InfoPage';
import RichContent from '../../components/RichContent';
import {getPolicies} from '../../lib/content';
import {contactEmail,contactHref} from '../../lib/store-info';

export const metadata={title:'Policies'};

const policyLabels={
 'refund-policy':'Returns, exchanges & refunds',
 'shipping-policy':'Shipping & delivery',
 'terms-of-service':'Terms of service',
 'privacy-policy':'Privacy policy',
 'terms-of-sale':'Terms of sale',
 'contact-information':'Contact & grievance'
};

export default async function PoliciesPage() {
 const policies=await getPolicies();
 return <InfoPage eyebrow="HERE TO HELP" title="Our policies." intro="Clear information on delivery, exchanges, privacy and shopping with AX.">
  {policies.length?<>
   <nav className="policy-index" aria-label="Policy contents">{policies.map(policy=><a key={policy.key} href={`#${policy.key}`}>{policyLabels[policy.key] || policy.title}</a>)}</nav>
   {policies.map(policy=><section key={policy.key} id={policy.key} className="policy-section"><h2>{policyLabels[policy.key] || policy.title}</h2>{policy.body?<RichContent html={policy.body}/>:policy.url?<a className="underlined-link" href={policy.url} target="_blank" rel="noopener noreferrer">READ {(policyLabels[policy.key] || policy.title).toUpperCase()} ↗</a>:null}</section>)}
  </>:<p>We couldn’t load the policies at the moment. Please email <a className="text-link" href={contactHref}>{contactEmail}</a> for the current terms before placing an order.</p>}
 </InfoPage>;
}
