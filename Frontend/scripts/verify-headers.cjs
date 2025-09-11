const fs = require('fs');
const path = require('path');
const pagesDir = path.resolve(__dirname,'../pages');
const indexHtml = path.resolve(__dirname,'../index.html');

function extractHeader(html){
  const start = html.search(/<header(?:\s[^>]*)?>/i);
  const end = html.search(/<\/header>/i);
  if(start === -1 || end === -1) return null;
  return html.slice(start, end+9).replace(/\s+/g,' ').trim();
}

const canon = extractHeader(fs.readFileSync(indexHtml,'utf8'));
if(!canon){
  console.error('Canonical header not found');
  process.exit(1);
}

const files = fs.readdirSync(pagesDir).filter(f=>f.endsWith('.html'));
const report = [];
for(const f of files){
  const p = path.join(pagesDir,f);
  const html = fs.readFileSync(p,'utf8');
  const hdr = extractHeader(html);
  const hasPva = /\/public\/js\/pva-nav.js/.test(html);
  report.push({file:f, hasHeader: !!hdr, headerMatches: hdr===canon, hasPva});
}

console.log(JSON.stringify(report, null, 2));
