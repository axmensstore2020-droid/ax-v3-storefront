import InfoPage from '../../components/InfoPage';
import Icon from '../../components/Icon';
import {stores,storeHours,storeDays,contactEmail,contactHref} from '../../lib/store-info';
export const metadata={title:'Our stores'};
export default function StoresPage() {
 return <InfoPage eyebrow="FIND AX" title="Come say hello." intro="Two stores. One city. Find your next favourite in Coimbatore." wide><div className="store-grid">{stores.map((store,i)=><section id={store.key} className="store-card" key={store.key}><p className="eyebrow">AX / 0{i+1}</p><h2>{store.name}</h2><p className="muted">{store.city}</p><dl className="store-hours"><div><dt>{storeDays}</dt><dd>{storeHours} IST</dd></div></dl><a className="underlined-link" href={store.directions} target="_blank" rel="noopener noreferrer" aria-label={`Get directions to ${store.name}`}>GET DIRECTIONS <Icon name="arrow"/></a></section>)}</div><p className="store-contact">Need a hand? <a className="text-link" href={contactHref}>{contactEmail}</a></p></InfoPage>;
}
