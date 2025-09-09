// Lightweight navigation injector.
// Non-invasive: if the page already has a <nav> it will ensure the links exist.
const LINKS = [
  { href: '/pages/pvadashboard.html', text: 'Dashboard' },
  { href: '/pages/productshowcase.html', text: 'Marketplace' },
  { href: '/pages/portfolio.html', text: 'Portfolio' },
  { href: '/pages/checkoutmint.html', text: 'Checkout' },
  { href: '/pages/provenance.html', text: 'Provenance' },
  { href: '/pages/artifact.html', text: 'Artifact' }
];

function makeLink(a) {
  const el = document.createElement('a');
  el.href = a.href;
  el.textContent = a.text;
  el.className = 'injected-nav-link';
  el.style.color = 'inherit';
  el.style.textDecoration = 'none';
  el.style.padding = '6px 10px';
  el.style.borderRadius = '6px';
  return el;
}

function injectInlineStyles() {
  if (document.getElementById('injected-nav-styles')) return;
  const s = document.createElement('style');
  s.id = 'injected-nav-styles';
  s.textContent = `
    .injected-nav { position:fixed;top:10px;right:10px;z-index:9999;background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.03);display:flex;gap:6px;align-items:center }
    .injected-nav a.injected-nav-link{ color:var(--text-light,#e8f4f0); font-weight:600 }
    .injected-nav a.injected-nav-link:hover{ background:rgba(255,255,255,0.04) }
    @media (max-width:640px){ .injected-nav{ right:8px; left:8px; bottom:8px; top:auto; justify-content:center; flex-wrap:wrap } }
  `;
  document.head.appendChild(s);
}

function ensureNav() {
  injectInlineStyles();
  // If page already has a visible nav element with links, add missing links into it.
  const existingNav = document.querySelector('header nav, nav');
  if (existingNav) {
    // add links only if they don't already exist
    LINKS.forEach(l => {
      if (!existingNav.querySelector(`a[href="${l.href}"]`)) {
        const a = makeLink(l);
        existingNav.appendChild(a);
      }
    });
    return;
  }

  // Otherwise create a small floating nav (non-destructive)
  if (document.querySelector('.injected-nav')) return;
  const nav = document.createElement('div');
  nav.className = 'injected-nav';
  LINKS.forEach(l => nav.appendChild(makeLink(l)));
  document.body.appendChild(nav);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureNav);
else ensureNav();
