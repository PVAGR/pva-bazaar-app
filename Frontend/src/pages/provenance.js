import { api } from '../api/client';

function getQuery(key) {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get(key);
  } catch {
    return null;
  }


function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el && value != null) el.textContent = String(value);
}

function setHTML(selector, value) {
  const el = document.querySelector(selector);
  if (el && value != null) el.innerHTML = value;
}

function setImage(selector, src) {
  const el = document.querySelector(selector);
  if (el && src) {
    el.src = src;
    el.style.display = '';
  }
}
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
    // Artifact details
    setText('#artifact-name', art.name || art.title || 'Artifact');
    setText('#artifact-desc', art.description || '');
    setImage('#artifact-image', art.imageUrl);
    setText('#artifact-name-detail', art.name || art.title || '');
    setText('#creation-date', art.creationDate ? new Date(art.creationDate).toLocaleDateString() : '');
    setText('#primary-material', art.material || '');
    setText('#collection', art.collection || '');
    // Blockchain details
    setText('#network', chain.network || '');
    setText('#token-standard', chain.tokenStandard || '');
    setText('#contract-address', chain.contractAddress || '');
    setText('#token-id-value', chain.tokenId || '');
    setText('#token-id-detail', chain.tokenId || '');
    // Provenance hash
    setText('#provenance-hash', data.provenanceHash || '');
    // Physical authentication
    setText('#physical-serial', art.physicalSerial || '');
    setText('#authentication-code', data.authenticationCode || '');
    // Last verification
    if (data.verification?.lastVerified) {
      const ts = new Date(data.verification.lastVerified);
      const timeString = `${ts.toISOString().split('T')[0]} ${ts.getUTCHours().toString().padStart(2, '0')}:${ts.getUTCMinutes().toString().padStart(2, '0')} UTC`;
      setText('#last-verification-time', timeString);
    }
    // QR codes
    if (chain.contractAddress && chain.tokenId) {
      const nftUrl = `https://opensea.io/assets/base/${chain.contractAddress}/${chain.tokenId}`;
      setImage('#nft-qr', `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(nftUrl)}`);
      setText('#nft-qr-desc', 'Scan to verify NFT on OpenSea');
    }
    if (art.slug) {
      const prodUrl = `https://www.pvabazaar.com/products/p/${art.slug}`;
      setImage('#product-qr', `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(prodUrl)}`);
      setText('#product-qr-desc', 'Scan for complete product details');
    }
    if (art.ipfsHash) {
      const ipfsUrl = `https://ipfs.io/ipfs/${art.ipfsHash}`;
      setImage('#ipfs-qr', `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ipfsUrl)}`);
      setText('#ipfs-qr-desc', 'IPFS immutable metadata');
    }
    // Ownership history
    const tbody = document.getElementById('ownership-history-body');
    if (tbody && Array.isArray(data.ownershipHistory)) {
      if (data.ownershipHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No ownership history found.</td></tr>';
      } else {
        tbody.innerHTML = data.ownershipHistory.map(entry => `
          <tr>
            <td>${entry.ownerName || ''}</td>
            <td class="wallet-address">${entry.walletAddress || ''}</td>
            <td>${entry.ownershipType || ''}</td>
            <td>${entry.dateAcquired ? new Date(entry.dateAcquired).toLocaleDateString() : ''}</td>
            <td><span class="status-badge ${entry.status === 'Current' ? 'status-current' : 'status-previous'}">${entry.status || ''}</span></td>
          </tr>
        `).join('');
      }
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
    setText('#progress-text', s.totalShares > 0 ? `${Math.round((s.soldShares / s.totalShares) * 100)}% Sold` : '0% Sold');
    setText('#total-shares', s.totalShares ?? '');
    setText('#shares-sold', s.soldShares ?? '');
    setText('#per-share', s.sharePrice != null ? `$${Number(s.sharePrice).toFixed(2)}` : '');
    setText('#majority-threshold', s.majorityThreshold ?? '');
  } catch (e) {
    // Non-fatal if shares aren’t configured yet
    setText('#progress-text', 'N/A');
    setText('#total-shares', 'N/A');
    setText('#shares-sold', 'N/A');
    setText('#per-share', 'N/A');
    setText('#majority-threshold', 'N/A');
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
  if (!id) {
    setText('#artifact-name', 'No certificate ID provided');
    return;
  }
  await loadCertificate(id);
  await loadShares(id);
  wireVerify(id);
}

window.addEventListener('DOMContentLoaded', boot);
