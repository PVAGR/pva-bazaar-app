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

function ensureNav() {
  // If page already has a visible nav element with links, add missing links into it.
  const existingNav = document.querySelector('header nav, nav');
  if (existingNav) {
    LINKS.forEach(l => {
      if (!existingNav.querySelector(`a[href="${l.href}"]`)) {
        const a = makeLink(l);
        const li = document.createElement('li');
        li.appendChild(a);
        const ul = existingNav.querySelector('ul') || (function(){ const u=document.createElement('ul'); existingNav.appendChild(u); return u; })();
        ul.appendChild(li);
      }
    });
    return;
  }

  // If there's a header but no nav, create a normal nav inside the header (not floating)
  const header = document.querySelector('header');
  if (header) {
    const nav = document.createElement('nav');
    nav.className = 'pva-nav';
    const ul = document.createElement('ul');
    LINKS.forEach(l => {
      const li = document.createElement('li');
      const a = makeLink(l);
      li.appendChild(a);
      ul.appendChild(li);
    });
    nav.appendChild(ul);
    // insert before header badge or at end
    const badge = header.querySelector('.header-badge');
    if (badge) header.insertBefore(nav, badge);
    else header.appendChild(nav);
    return;
  }

  // As a last resort, create a normal non-fixed nav at top of the body
  if (!document.querySelector('body > nav.pva-nav')) {
    const nav = document.createElement('nav');
    nav.className = 'pva-nav';
    const ul = document.createElement('ul');
    LINKS.forEach(l => {
      const li = document.createElement('li');
      const a = makeLink(l);
      li.appendChild(a);
      ul.appendChild(li);
    });
    nav.appendChild(ul);
    document.body.insertAdjacentElement('afterbegin', nav);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureNav);
else ensureNav();
