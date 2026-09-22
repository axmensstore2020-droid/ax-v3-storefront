import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeRichContent} from '../lib/sanitize-content.js';

test('rich Shopify content strips scripts, event handlers and javascript URLs',()=>{
  const dirty='<p onclick="alert(1)">Safe <strong>copy</strong></p><script>alert(2)</script><a href="javascript:alert(3)" onmouseover="alert(4)">link</a>';
  const safe=sanitizeRichContent(dirty);
  assert.match(safe,/Safe <strong>copy<\/strong>/);
  assert.doesNotMatch(safe,/<script|onclick|onmouseover|javascript:/i);
});

test('rich content keeps only approved URL schemes',()=>{
  const safe=sanitizeRichContent('<a href="https://axstore.in">AX</a><a href="//evil.test">bad</a><a href="data:text/html,x">bad2</a>');
  assert.match(safe,/href="https:\/\/axstore\.in"/);
  assert.doesNotMatch(safe,/href="\/\/evil|data:text/i);
});
