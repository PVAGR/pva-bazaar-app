document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('pva-theme');

  // Mark active link by path match
  const path = location.pathname.toLowerCase();
  const links = document.querySelectorAll('.pva-nav a');

  links.forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (path === '/' && href === '/') a.classList.add('active');
    else if (href !== '/' && path.endsWith(href.replace(/^.*\/pages\//,''))) a.classList.add('active');
    else if (href !== '/' && path.includes(href)) a.classList.add('active');
  });

  // Footer year
  const y = document.getElementById('pvaYear');
  if (y) y.textContent = new Date().getFullYear();

  document.getElementById('connectWallet')?.addEventListener('click', () => {
    alert('Wallet connect coming soon');
  });
  document.getElementById('searchToggle')?.addEventListener('click', () => {
    alert('Search coming soon');
  });
});
