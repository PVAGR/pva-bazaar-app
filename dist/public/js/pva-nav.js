document.addEventListener('DOMContentLoaded', () => {
  // Enhance existing page header/nav/footer non-destructively.
  if (window.pvaNavEnhancerRun) return;
  window.pvaNavEnhancerRun = true;

  document.body.classList.add('pva-theme');

  const LINKS = [
    { href: '/pages/pvadashboard.html', text: '📊 Dashboard' },
    { href: '/pages/productshowcase.html', text: '🛍️ Marketplace' },
    { href: '/pages/portfolio.html', text: '💼 Portfolio' },
    { href: '/pages/checkoutmint.html', text: '💳 Checkout' },
    { href: '/pages/provenance.html', text: '🏷️ Provenance' },
    { href: '/pages/artifact.html', text: '🔍 Artifact' }
  ];

  // Find an existing nav container to augment
  const navContainer = document.querySelector('header nav, header .nav, nav, .navbar, .site-nav');

  function ensureLinks(container) {
    if (!container) return;
    // If container contains a UL, append LI items; else append anchors
    const ul = container.querySelector('ul');
    LINKS.forEach(l => {
      if (ul) {
        if (!ul.querySelector(`a[href="${l.href}"]`)) {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = l.href;
          a.textContent = l.text;
          li.appendChild(a);
          ul.appendChild(li);
        }
      } else {
        if (!container.querySelector(`a[href="${l.href}"]`)) {
          const a = document.createElement('a');
          a.href = l.href;
          a.textContent = l.text;
          container.appendChild(a);
        }
      }
    });
  }

  ensureLinks(navContainer);

  // Mark active link by filename/path
  const path = location.pathname.replace(/\/+/g, '/').toLowerCase();
  const filename = path.split('/').pop();
  const allNavLinks = document.querySelectorAll('header nav a, nav a, .navbar a, .site-nav a, .pva-nav a');
  allNavLinks.forEach(a => a.classList.remove('active'));
  allNavLinks.forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (!href) return;
    if (href === path || href === '/' + filename || href.endsWith(filename)) {
      a.classList.add('active');
    }
  });

  // Footer year update (non-invasive)
  const yearTargets = [document.getElementById('pvaYear'), document.querySelector('.copyright'), document.querySelector('#footer-year')];
  yearTargets.forEach(t => {
    if (!t) return;
    if (t.tagName === 'SPAN' || t.id === 'pvaYear') t.textContent = new Date().getFullYear();
    else t.textContent = `© ${new Date().getFullYear()} PVA Bazaar. All rights reserved.`;
  });

  // Wire wallet/search buttons if present
  const connectButtons = [document.getElementById('connectWallet'), document.getElementById('connectBtn'), document.querySelector('.connect-wallet'), document.querySelector('[data-action="connect-wallet"]')];
  connectButtons.forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (typeof window.connectWallet === 'function') return window.connectWallet();
      alert('Wallet connect not available in this environment.');
    });
  });

  const searchButtons = [document.getElementById('searchToggle'), document.querySelector('.search-toggle'), document.querySelector('[data-action="toggle-search"]')];
  searchButtons.forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      const el = document.querySelector('input[type="search"], input[placeholder*="Search"]');
      if (el) el.focus();
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
});

