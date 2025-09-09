import { api } from '../api/client';

function getQuery(key) {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get(key);
  } catch {
    return null;
  }
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el && value != null) el.textContent = String(value);
}

function setImage(selector, src) {
  const el = document.querySelector(selector);
  if (el && src) el.src = src;
}

function setProgress(total, sold) {
  const bar = document.getElementById('shares-progress-bar') || document.querySelector('.progress-bar');
  const text = document.getElementById('shares-progress-text') || document.querySelector('.progress-text');
  const t = Number(total) || 0;
  const s = Number(sold) || 0;
  const pct = t > 0 ? Math.min(100, Math.max(0, Math.round((s / t) * 100))) : 0;
  if (bar) bar.style.width = `${pct}%`;
  if (text) text.textContent = `${pct}% Sold`;
}

async function loadCertificate(id) {
  try {
    const res = await api.get(`/certificates/${id}`);
    const data = res?.data || {};
    const art = data.artifact || {};
    const chain = data.blockchain || {};

    // Header details
    setText('.item-details h2', art.name || art.title || 'Artifact');
    setText('.item-details p', art.description || '');
    setImage('.item-image img', art.imageUrl);

    // Token and physical info
    if (chain?.tokenId) setText('#token-id', `Token ID: ${chain.tokenId}`);
    if (art.physicalSerial) setText('#physical-serial', art.physicalSerial);
    if (data.authenticationCode) setText('#authentication-code', data.authenticationCode);
    if (data.verification?.lastVerified) {
      const ts = new Date(data.verification.lastVerified);
      const timeString = `${ts.toISOString().split('T')[0]} ${ts.getUTCHours().toString().padStart(2, '0')}:${ts.getUTCMinutes().toString().padStart(2, '0')} UTC`;
      setText('#last-verification-time', timeString);
    }
  } catch (e) {
    console.warn('Certificate load failed:', e.message);
  }
}

async function loadShares(id) {
  try {
    const res = await api.get(`/transactions/shares/status/${id}`);
    const s = res?.data || {};
    if (!s.enabled) return;
    setProgress(s.totalShares, s.soldShares);

    const totalEl = document.getElementById('total-shares-value') || document.querySelectorAll('.share-stat-value')[0];
    const soldEl = document.getElementById('sold-shares-value') || document.querySelectorAll('.share-stat-value')[1];
    const priceEl = document.getElementById('share-price-value') || document.querySelectorAll('.share-stat-value')[2];
    const majorityEl = document.getElementById('majority-threshold-value') || document.querySelectorAll('.share-stat-value')[3];

    if (totalEl) totalEl.textContent = String(s.totalShares ?? 0);
    if (soldEl) soldEl.textContent = String(s.soldShares ?? 0);
    if (priceEl) priceEl.textContent = `$${(s.sharePrice ?? 0).toFixed ? s.sharePrice.toFixed(2) : s.sharePrice}`;
    if (majorityEl) majorityEl.textContent = String(s.majorityThreshold ?? 0);
  } catch (e) {
    // Non-fatal if shares aren’t configured yet
    console.info('Shares status unavailable:', e.message);
  }
}

function wireVerify(id) {
  const btn = document.getElementById('verify-button');
  const section = document.getElementById('verification-section');
  if (!btn) return;
  btn.onclick = async () => {
    try {
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Verifying...';
      btn.disabled = true;
      const res = await api.post(`/certificates/verify/${id}`, {});
      const last = res?.data?.lastVerification;
      if (last) {
        const ts = new Date(last);
        const timeString = `${ts.toISOString().split('T')[0]} ${ts.getUTCHours().toString().padStart(2, '0')}:${ts.getUTCMinutes().toString().padStart(2, '0')} UTC`;
        setText('#last-verification-time', timeString);
      }
      btn.innerHTML = '<i class="fas fa-check-circle"></i> Verified Successfully';
      btn.classList.add('verified');
      if (section) section.classList.add('verified');
      setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Verify Again';
        btn.disabled = false;
      }, 3000);
    } catch (e) {
      btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Verification Failed';
      console.warn('Verify failed:', e.message);
      setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-shield-check"></i> Verify Current Ownership';
        btn.disabled = false;
      }, 3000);
    }
  };
}

async function boot() {
  const id = getQuery('id');
  if (!id) return;
  await loadCertificate(id);
  await loadShares(id);
  wireVerify(id);
}

window.addEventListener('DOMContentLoaded', boot);
