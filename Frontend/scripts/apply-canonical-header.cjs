const fs = require('fs');
const path = require('path');

const pagesDir = path.resolve(__dirname, '../pages');
const indexHtml = path.resolve(__dirname, '../index.html');

function readCanonicalHeader(){
  const html = fs.readFileSync(indexHtml,'utf8');
  const start = html.indexOf('<header>');
  const end = html.indexOf('</header>');
  if(start === -1 || end === -1) throw new Error('Canonical header not found in index.html');
  return html.slice(start, end+9);
}

function ensureRuntimeScripts(body){
  // ensure inject-nav then pva-nav exist before </body>
  const inject = '<script src="/src/nav/inject-nav.js" defer></script>';
  const pva = '<script src="/public/js/pva-nav.js" defer></script>';
  if(body.includes(inject) && body.includes(pva)) return body;
  // remove any existing stray duplicates
  let b = body.replace(/<script[^>]*src="\/src\/nav\/inject-nav.js"[^>]*><\/script>/g,'')
              .replace(/<script[^>]*src="\/public\/js\/pva-nav.js"[^>]*><\/script>/g,'');
  const idx = b.lastIndexOf('</body>');
  if(idx === -1) return body;
  const insert = `  ${inject}\n  ${pva}\n`;
  b = b.slice(0, idx) + insert + b.slice(idx);
  return b;
}

function replaceHeaderInFile(file, headerHtml){
  const orig = fs.readFileSync(file,'utf8');
  // find first <header ...> ... </header> or <header> ... </header>
  const headerStart = orig.search(/<header(?:\s[^>]*)?>/i);
  const headerEnd = orig.search(/<\/header>/i);
  if(headerStart !== -1 && headerEnd !== -1 && headerEnd > headerStart){
    const before = orig.slice(0, headerStart);
    const after = orig.slice(headerEnd + 9);
    let newHtml = before + headerHtml + after;
    newHtml = ensureRuntimeScripts(newHtml);
    fs.writeFileSync(file,newHtml,'utf8');
    return true;
  } else {
    // If no header, insert after <body>
    const bodyIdx = orig.search(/<body[^>]*>/i);
    if(bodyIdx !== -1){
      const insertIdx = orig.indexOf('>', bodyIdx) + 1;
      let newHtml = orig.slice(0, insertIdx) + '\n' + headerHtml + '\n' + orig.slice(insertIdx);
      newHtml = ensureRuntimeScripts(newHtml);
      fs.writeFileSync(file,newHtml,'utf8');
      return true;
    }
  }
  return false;
}

function main(){
  const header = readCanonicalHeader();
  const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
  const changed = [];
  for(const f of files){
    const filePath = path.join(pagesDir,f);
    const ok = replaceHeaderInFile(filePath, header);
    if(ok) changed.push(f);
  }
  console.log('Changed pages:', changed);
}

main();
