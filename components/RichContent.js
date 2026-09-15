import sanitizeHtml from 'sanitize-html';
export default function RichContent({html}) {
 const safe=sanitizeHtml(html || '',{
  allowedTags:['p','br','strong','b','em','i','u','s','h2','h3','h4','ul','ol','li','a','blockquote','div','span','table','thead','tbody','tr','th','td','hr'],
  allowedAttributes:{a:['href','title'],th:['scope','colspan'],td:['colspan']},
  allowedSchemes:['http','https','mailto'],allowProtocolRelative:false
 });
 return <div className="rich-content" dangerouslySetInnerHTML={{__html:safe}}/>;
}
