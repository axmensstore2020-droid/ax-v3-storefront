import sanitizeHtml from 'sanitize-html';

export function sanitizeRichContent(html=''){
  return sanitizeHtml(String(html || ''),{
    allowedTags:['p','br','strong','b','em','i','u','s','h2','h3','h4','ul','ol','li','a','blockquote','div','span','table','thead','tbody','tr','th','td','hr'],
    allowedAttributes:{a:['href','title'],th:['scope','colspan'],td:['colspan']},
    allowedSchemes:['http','https','mailto'],
    allowProtocolRelative:false,
    disallowedTagsMode:'discard'
  });
}
