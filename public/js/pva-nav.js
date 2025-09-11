document.addEventListener('DOMContentLoaded', () => {
  // Prevent repeated augmentation
  if (document.body.dataset.pvaNavInjected === '1') return;
  document.body.dataset.pvaNavInjected = '1';
  document.body.classList.add('pva-theme');

  // Desired canonical nav links to ensure are present in the page header
  const desiredLinks = [
    { href: '/pages/pvadashboard.html', text: 'Dashboard' },
    { href: '/pages/productshowcase.html', text: 'Marketplace' },
    { href: '/pages/portfolio.html', text: 'Portfolio' },
    { href: '/pages/checkoutmint.html', text: 'Checkout' },
    { href: '/pages/provenance.html', text: 'Provenance' },
    { href: '/pages/artifact.html', text: 'Artifact' }
  ];

  // Find existing header; prefer augmenting an existing header (non-destructive)
  // Remove legacy injected header or floating nav elements (from previous builds)
  document.querySelectorAll('.pva-header, .injected-nav').forEach(el => el.remove());

  // If multiple <header> elements exist, merge links from the earlier one(s) into the final canonical header and remove duplicates
  const headers = Array.from(document.querySelectorAll('header'));
  if (headers.length > 1) {
    const keep = headers[headers.length - 1]; // prefer the last header as canonical
    // for each header to remove (all except keep), move links into keep
    headers.slice(0, headers.length - 1).forEach(h => {
      const navLinks = h.querySelectorAll('nav a');
      if (navLinks.length && keep) {
        let keepNav = keep.querySelector('nav');
        if (!keepNav) {
          keepNav = document.createElement('nav');
          keepNav.classList.add('pva-nav');
          keep.appendChild(keepNav);
        }
        let keepUl = keepNav.querySelector('ul');
        if (!keepUl) { keepUl = document.createElement('ul'); keepNav.appendChild(keepUl); }

        navLinks.forEach(a => {
          const href = a.getAttribute('href');
          if (!href) return;
          if (!keepNav.querySelector(`a[href="${href}"]`)) {
            const li = document.createElement('li');
            const copy = a.cloneNode(true);
            li.appendChild(copy);
            keepUl.appendChild(li);
          }
        });
      }
      h.remove();
    });
  }

  const header = document.querySelector('header');
  if (header) {
    // find or create a nav element inside the header
    let nav = header.querySelector('nav.pva-nav') || header.querySelector('nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.classList.add('pva-nav');
      nav.setAttribute('aria-label', 'Primary');
      // insert nav before user-profile if that exists, else append
      const userNav = header.querySelector('.user-nav');
      if (userNav) header.insertBefore(nav, userNav);
      else header.appendChild(nav);
    }

    let ul = nav.querySelector('ul');
    if (!ul) {
      ul = document.createElement('ul');
      nav.appendChild(ul);
    }

    // Merge desired links: add only missing hrefs. Preserve existing anchors and their text.
    desiredLinks.forEach(link => {
      const existing = Array.from(nav.querySelectorAll('a')).find(a => (a.getAttribute('href') || '') === link.href);
      if (!existing) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.setAttribute('href', link.href);
        a.textContent = link.text;
        li.appendChild(a);
        ul.appendChild(li);
      }
    });
  } else {
    // No header present: create a single nav at the top of the body (minimal, only if necessary)
    const nav = document.createElement('nav');
    nav.classList.add('pva-nav');
    nav.setAttribute('aria-label', 'Primary');
    const ul = document.createElement('ul');
    desiredLinks.forEach(link => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.setAttribute('href', link.href);
      a.textContent = link.text;
      li.appendChild(a);
      ul.appendChild(li);
    });
    nav.appendChild(ul);
    document.body.insertAdjacentElement('afterbegin', nav);
  }

  // Mark active link across any pva-nav on the page
  const path = location.pathname.replace(/\/+/g, '/').toLowerCase();
  const filename = path.split('/').pop();
  const navLinks = document.querySelectorAll('.pva-nav a');
  navLinks.forEach(a => a.classList.remove('active'));
  navLinks.forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (!href) return;
    if (href === path || href === '/' + filename || (filename && href.endsWith(filename))) {
      a.classList.add('active');
    }
  });

  // Ensure footer exists (unchanged behavior)
  if (!document.querySelector('.pva-footer')) {
    const footerHtml = `
  <footer class="pva-footer">
    <div class="pva-footer-logo">PVA Bazaar</div>
    <div class="pva-footer-links">
      <a href="/pages/productshowcase.html">Marketplace</a>
      <a href="/pages/portfolio.html">Portfolio</a>
      <a href="/pages/provenance.html">Provenance</a>
    </div>
    <div class="pva-social">
      <a href="#"><i class="fab fa-twitter"></i></a>
      <a href="#"><i class="fab fa-instagram"></i></a>
      <a href="#"><i class="fab fa-discord"></i></a>
    </div>
    <div class="pva-copy">© <span id="pvaYear">2025</span> PVA Bazaar. All rights reserved.</div>
  </footer>`;
    document.body.insertAdjacentHTML('beforeend', footerHtml);
  }

  // Set footer year if present
  const yEl = document.getElementById('pvaYear');
  if (yEl) yEl.textContent = new Date().getFullYear();

  // Lightweight handlers (idempotent) for connect/search
  if (!window.pvaNavHandlersAttached) {
    // attach to any connectWallet button if present now
    document.querySelectorAll('#connectWallet, .connect-wallet, .pva-connect').forEach(el => {
      el.addEventListener('click', () => {
        if (typeof window.connectWallet === 'function') return window.connectWallet();
        alert('Wallet connect is not available in this build.');
      });
    });

    document.querySelectorAll('#searchToggle, .pva-search-toggle').forEach(el => {
      el.addEventListener('click', () => {
        const input = document.querySelector('input[type="search"], input[placeholder*="Search"]');
        if (input) input.focus();
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    window.pvaNavHandlersAttached = true;
  }
});

