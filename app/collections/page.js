import Link from 'next/link';
import InfoPage from '../../components/InfoPage';
import Icon from '../../components/Icon';
import {getNavigation} from '../../lib/content';
import {pageMetadata} from '../../lib/seo';

export const metadata=pageMetadata({
 title:'Men’s Clothing Collections',
 description:'Explore AX menswear collections including old money, Korean fits, streetwear, formal wear and seasonal drops. Curated in Coimbatore with delivery across India.',
 path:'/collections'
});

export default async function CollectionsPage() {
 const {styles,seasons}=await getNavigation();
 return <InfoPage eyebrow="EXPLORE" title="A wardrobe, your way." intro="Start with a mood. Make it your own." wide><section className="collection-directory-section"><h2>Style collections</h2><div className="collection-directory">{styles.map((style,i)=><Link href={style.href} key={style.key}><span className="category-number">{String(i+1).padStart(2,'0')}</span><span>{style.label}</span><Icon name="arrow"/></Link>)}</div></section><section className="collection-directory-section"><h2>The latest chapters</h2><div className="collection-directory seasonal-directory">{seasons.map(season=><Link key={season.key} href={season.href}><span>{season.label}</span><Icon name="arrow"/></Link>)}</div></section></InfoPage>;
}
