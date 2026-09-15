import InfoPage from './InfoPage';
import RichContent from './RichContent';
import {getPageContent} from '../lib/content';
import {pageDefaults} from '../lib/page-defaults';
export default async function ShopifyInfoPage({kind,eyebrow='HERE TO HELP',children}) {
 const fallback=pageDefaults[kind],page=await getPageContent(fallback.handle);
 return <InfoPage eyebrow={eyebrow} title={fallback.title}><RichContent html={page?.body || fallback.body}/>{children}</InfoPage>;
}
