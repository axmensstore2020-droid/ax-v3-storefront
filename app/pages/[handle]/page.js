import {notFound,redirect} from 'next/navigation';
import InfoPage from '../../../components/InfoPage';
import RichContent from '../../../components/RichContent';
import {getPageContent} from '../../../lib/content';
import {normalizeMenuUrl} from '../../../lib/content-utils';
export async function generateMetadata({params}) {const {handle}=await params,page=await getPageContent(handle);return {title:page?.title || 'AX'};}
export default async function Page({params}) {
 const {handle}=await params,path=`/pages/${handle}`,target=normalizeMenuUrl(path);
 if(target!==path) redirect(target);
 const page=await getPageContent(handle);if(!page) notFound();
 return <InfoPage title={page.title}><RichContent html={page.body}/></InfoPage>;
}
