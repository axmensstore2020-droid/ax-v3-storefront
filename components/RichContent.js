import {sanitizeRichContent} from '../lib/sanitize-content.js';
export default function RichContent({html}) {
 const safe=sanitizeRichContent(html);
 return <div className="rich-content" dangerouslySetInnerHTML={{__html:safe}}/>;
}
