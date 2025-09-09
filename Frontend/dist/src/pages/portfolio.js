import { api } from '../api/client';

function formatPrice(p) {
  if (p == null) return '-';
  const n = Number(p);
  if (Number.isNaN(n)) return String(p);
  return '$' + n.toFixed(2);
}

async function loadPortfolio() {
  try {
    // Load artifacts from API
    const res = await api.get('/artifacts');
    const artifacts = res?.artifacts || [];

    // Support either the legacy .artifacts-table or the page's .holdings-table
    const artifactsTableBody = document.querySelector('.artifacts-table tbody');
    const holdingsTableBody = document.querySelector('.holdings-table tbody');
    const targetBody = artifactsTableBody || holdingsTableBody;

    if (targetBody) {
      targetBody.innerHTML = artifacts.map(a => `
        <tr>
          <td>
            <div class="asset">
              <div class="asset-icon"><i class="fas fa-gem"></i></div>
              <div>
                <div class="asset-name">${a.name || 'Unknown'}</div>
                <div class="asset-symbol">${a.symbol || ''}</div>
              </div>
            </div>
          </td>
          <td>${a.category || '-'}</td>
          <td>${formatPrice(a.price)}</td>
          <td><span class="status-badge status-active">Active</span></td>
          <td class="action-cell">
            <a class="btn btn-sm btn-edit" href="/pages/productshowcase.html?id=${a._id}">View</a>
            <button class="table-btn btn-buy" data-id="${a._id}">Buy</button>
          </td>
        </tr>
      `).join('');
    } else {
      // Page has no table the script knows about; skip DOM population silently.
      console.debug('No artifacts/holdings table found on this page.');
    }

    // Update simple stats (fall back to any visible stat-value)
    const totalEl = document.querySelector('.portfolio-overview .stat-card .stat-value') || document.querySelector('.stat-card .stat-value');
    if (totalEl) totalEl.textContent = String(artifacts.length);

    // Attach buy handlers (simple navigation for now)
    document.querySelectorAll('.table-btn.btn-buy').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        // Navigate to checkout page with selected artifact
        window.location.href = `/pages/checkoutmint.html?id=${id}`;
      });
    });
  } catch (e) {
    console.warn('Portfolio load failed:', e?.message || e);
  }
}

window.addEventListener('DOMContentLoaded', loadPortfolio);
