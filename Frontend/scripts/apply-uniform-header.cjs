const fs = require('fs');
const path = require('path');
const pagesDir = path.resolve(__dirname,'../pages');

const navItems = [
  {key:'home', label:'Home', href:'/'},
  {key:'dashboard', label:'Dashboard', href:'/pages/pvadashboard.html'},
  {key:'marketplace', label:'Marketplace', href:'/pages/productshowcase.html'},
  {key:'portfolio', label:'Portfolio', href:'/pages/portfolio.html'},
  {key:'checkout', label:'Checkout', href:'/pages/checkoutmint.html'},
  {key:'provenance', label:'Provenance', href:'/pages/provenance.html'},
  {key:'artifact', label:'Artifact', href:'/pages/artifact.html'},
  {key:'shares', label:'Shares', href:'/pages/pvashares.html'}
];

function activeForFile(filename){
  const f = filename.toLowerCase();
  if(f==='index.html' || f==='') return 'home';
  if(f.includes('dashboard')||f.includes('admin')) return 'dashboard';
  if(f.includes('product')||f.includes('market')||f.includes('shared ownership')) return 'marketplace';
  if(f.includes('portfolio')) return 'portfolio';
  if(f.includes('checkout')||f.includes('mint')) return 'checkout';
  if(f.includes('provenance')||f.includes('provtrack')) return 'provenance';
  if(f.includes('artifact')) return 'artifact';
  if(f.includes('pvashares')||f.includes('shares')) return 'shares';
  return 'home';
}

function buildHeader(activeKey){
  const items = navItems.map(it => {
    const cls = it.key===activeKey? ' class="active"' : '';
    return `          <li><a href="${it.href}"${cls}>${it.label}</a></li>`;
  }).join('\n');

  return `    <header>
      <a href="/" class="logo">
        <i class="fas fa-gem logo-icon"></i>
        <div class="logo-text">PVA Bazaar</div>
      </a>
      <nav>
        <ul>
${items}
        </ul>
      </nav>
      <div class="header-actions">
        <button class="icon-btn" id="searchToggle" title="Search">
          <i class="fa-solid fa-magnifying-glass"></i>
        </button>
        <button class="btn" id="connectWallet">
          <i class="fa-solid fa-wallet"></i>
          Connect Wallet
        </button>
      </div>
    </header>`;
}

function replaceHeaderInFile(file, headerHtml){
  const orig = fs.readFileSync(file,'utf8');
  const headerStart = orig.search(/<header(?:\s[^>]*)?>/i);
  const headerEnd = orig.search(/<\/header>/i);
  if(headerStart !== -1 && headerEnd !== -1 && headerEnd > headerStart){
    const before = orig.slice(0, headerStart);
    const after = orig.slice(headerEnd + 9);
    const newHtml = before + headerHtml + after;
    fs.writeFileSync(file,newHtml,'utf8');
    return true;
  }
  // if no header, insert after <body>
  const bodyIdx = orig.search(/<body[^>]*>/i);
  if(bodyIdx !== -1){
    const insertIdx = orig.indexOf('>', bodyIdx) + 1;
    const newHtml = orig.slice(0, insertIdx) + '\n' + headerHtml + '\n' + orig.slice(insertIdx);
    fs.writeFileSync(file,newHtml,'utf8');
    return true;
  }
  return false;
}

const files = fs.readdirSync(pagesDir).filter(f=>f.endsWith('.html'));
const changed = [];
for(const f of files){
  const active = activeForFile(f);
  const header = buildHeader(active);
  const fp = path.join(pagesDir,f);
  const ok = replaceHeaderInFile(fp, header);
  if(ok) changed.push({file:f,active});
}
console.log('Updated headers:', JSON.stringify(changed, null, 2));
