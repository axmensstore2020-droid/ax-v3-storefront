import Link from 'next/link';
import InfoPage from '../../components/InfoPage';
import Icon from '../../components/Icon';
import {contactEmail,contactHref} from '../../lib/store-info';
export const metadata={title:'Contact'};
export default function ContactPage() {
 return <InfoPage eyebrow="HERE TO HELP" title="We’re listening." intro="A question, a little feedback, or something you would love to see at AX. Tell us."><a className="contact-email" href={contactHref}>{contactEmail}<Icon name="arrow"/></a><p className="muted">For order enquiries, include your order number and the item name.</p><div className="info-links"><Link href="/faqs">Browse FAQs <Icon name="arrow"/></Link><Link href="/policies">Our policies <Icon name="arrow"/></Link><Link href="/stores">Visit us in store <Icon name="arrow"/></Link></div></InfoPage>;
}
