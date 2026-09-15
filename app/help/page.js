import Link from 'next/link';
import InfoPage from '../../components/InfoPage';
import Icon from '../../components/Icon';
export const metadata={title:'Customer care'};
export default function HelpPage() {
 return <InfoPage eyebrow="HERE TO HELP" title="A little personal service." intro="Find an answer. Talk to us. Get to know AX."><nav className="info-links" aria-label="Help topics"><Link href="/contact">Contact — we’re listening <Icon name="arrow"/></Link><Link href="/policies">All policies <Icon name="arrow"/></Link><Link href="/faqs">FAQs <Icon name="arrow"/></Link><Link href="/careers">Careers <Icon name="arrow"/></Link><Link href="/about">Our story <Icon name="arrow"/></Link><Link href="/stores">Our stores <Icon name="arrow"/></Link></nav><section id="delivery" className="help-legacy"><Link href="/policies#shipping-policy">Delivery information →</Link></section><section id="exchanges" className="help-legacy"><Link href="/policies#refund-policy">Exchanges, returns and refunds →</Link></section></InfoPage>;
}
