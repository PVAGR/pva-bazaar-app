document.addEventListener('DOMContentLoaded', () => {
  // Avoid double-inject
  if (document.body.dataset.pvaNavInjected === '1') return;

  document.body.classList.add('pva-theme');
  document.body.dataset.pvaNavInjected = '1';

  const headerHtml = `
  <header class="pva-header">
    <a class="pva-logo" href="/">
      <i class="fas fa-gem logo-icon"></i>
      <span class="logo-text">PVA Bazaar</span>
    </a>
    <nav class="pva-nav" aria-label="Primary">
      <ul>
        <li><a href="/pages/pvadashboard.html">📊 Dashboard</a></li>
        <li><a href="/pages/productshowcase.html">🛍️ Marketplace</a></li>
        <li><a href="/pages/portfolio.html">💼 Portfolio</a></li>
        <li><a href="/pages/checkoutmint.html">💳 Checkout</a></li>
        <li><a href="/pages/provenance.html">🏷️ Provenance</a></li>
        <li><a href="/pages/artifact.html">🔍 Artifact</a></li>
      </ul>
    </nav>
    <div class="pva-header-actions">
      <button id="searchToggle" class="pva-icon-btn" aria-label="Search"><i class="fas fa-search"></i></button>
      <button id="connectWallet" class="pva-btn btn-sm">Connect Wallet</button>
    </div>
  </header>`;

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

  // Insert header at top of body (before first child), footer before closing
  if (!document.querySelector('.pva-header')) {
    document.body.insertAdjacentHTML('afterbegin', headerHtml);
  }

  if (!document.querySelector('.pva-footer')) {
    document.body.insertAdjacentHTML('beforeend', footerHtml);
  }

  // Mark active nav link
  const path = location.pathname.replace(/\/+/g, '/').toLowerCase();
  const navLinks = document.querySelectorAll('.pva-nav a');
  navLinks.forEach(a => a.classList.remove('active'));

  // Try to match by filename or by exact path
  const filename = path.split('/').pop();
  navLinks.forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (!href) return;
    if (href === path || href === '/' + filename || (href.endsWith(filename) && filename)) {
      a.classList.add('active');
    }
  });

  // Set footer year
  const yEl = document.getElementById('pvaYear');
  if (yEl) yEl.textContent = new Date().getFullYear();

  // Lightweight handlers (idempotent)
  if (!window.pvaNavHandlersAttached) {
    document.getElementById('connectWallet')?.addEventListener('click', () => {
      // Try to use existing connectWallet function if present
      if (typeof window.connectWallet === 'function') {
        window.connectWallet();
      } else {
        alert('Wallet connect is not available in this build.');
      }
    });

    document.getElementById('searchToggle')?.addEventListener('click', () => {
      const el = document.querySelector('input[type="search"], input[placeholder*="Search"]');
      if (el) {
        el.focus();
      } else {
        // fallback: scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    window.pvaNavHandlersAttached = true;
  }
});

