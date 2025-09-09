import { api } from '../api/client';

async function loadPortfolio() {
  try {
    // Load artifacts
    const list = await api.get('/artifacts');
    const artifacts = list?.artifacts || [];
    const table = document.querySelector('.artifacts-table tbody');
    if (table) {
      table.innerHTML = artifacts.map(a => `
        <tr>
          <td>${a.name}</td>
          <td>${a.category}</td>
          <td>$${a.price}</td>
          <td><span class="status-badge status-active">Active</span></td>
          <td class="action-buttons">
            <a class="btn btn-sm btn-edit" href="/pages/productshowcase.html?id=${a._id}">View</a>
          </td>
        </tr>
      `).join('');
    }

    // Update simple stats
    const totalEl = document.querySelector('.stat-card .stat-value');
    if (totalEl) totalEl.textContent = String(artifacts.length);
  } catch (e) {
    console.warn('Portfolio load failed:', e.message);
  }
}

window.addEventListener('DOMContentLoaded', loadPortfolio);
