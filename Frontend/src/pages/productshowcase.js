import { api } from '../api/client';

function getQuery(id) {
  const u = new URL(window.location.href);
  return u.searchParams.get(id);
}

async function loadProduct() {
  try {
    const id = getQuery('id');
    if (!id) return;
    const { ok, artifact } = await api.get(`/artifacts/${id}`);
    if (!ok || !artifact) return;
    // Populate a few key fields if present
    const nameEls = document.querySelectorAll('.product-header h1, .page-title, h1');
    nameEls.forEach(el => el.textContent = artifact.title || artifact.name);
    const priceEls = document.querySelectorAll('.current-price');
    priceEls.forEach(el => el.textContent = `$${artifact.price}`);
    const img = document.querySelector('.main-image img');
    if (img) img.src = artifact.imageUrl;

    // Load share status
    await loadShareStatus(id);
  } catch (e) {
    console.warn('Product load failed:', e.message);
  }
}

window.addEventListener('DOMContentLoaded', loadProduct);

async function loadShareStatus(id) {
  try {
    const res = await api.get(`/transactions/shares/status/${id}`);
    const s = res?.data || {};
    if (!s.enabled) return;
    const pct = s.totalShares ? Math.round((s.soldShares / s.totalShares) * 100) : 0;
    const progressEls = document.querySelectorAll('.progress-text');
    progressEls.forEach(el => el.textContent = `${pct}% Sold`);
  } catch (e) {
    // Non-fatal
  }
}

function ensureAuth() {
  let token = localStorage.getItem('token');
  if (token) return token;
  const email = prompt('Login required. Enter email (try admin@pvabazaar.org):');
  const password = prompt('Enter password (try admin123):');
  if (!email || !password) return null;
  return api.post('/auth/login', { email, password })
    .then(r => {
      if (r?.ok && r?.token) {
        localStorage.setItem('token', r.token);
        return r.token;
      }
      return null;
    })
    .catch(() => null);
}

async function buyShares(shares = 1) {
  const id = getQuery('id');
  if (!id) return;
  const tokenOrPromise = ensureAuth();
  const token = typeof tokenOrPromise === 'string' ? tokenOrPromise : await tokenOrPromise;
  if (!token) return alert('Login required to buy shares.');
  try {
    const wallet = 'demo-wallet';
    const amountUSD = 0;
    const res = await api.post('/transactions/shares/buy', { artifactId: id, wallet, amountUSD, shares });
    if (res?.ok) {
      alert('Shares purchased successfully');
      await loadShareStatus(id);
    } else {
      alert(res?.message || 'Failed to buy shares');
    }
  } catch (e) {
    alert(`Error: ${e.message}`);
  }
}

// Expose a minimal global for existing buttons if present
// eslint-disable-next-line no-undef
window.buyNow = () => buyShares(1);
