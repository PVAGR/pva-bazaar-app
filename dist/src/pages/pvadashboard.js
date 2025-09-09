import { api } from '../api/client';

async function loadKPIs() {
  try {
    const arts = await api.get('/artifacts');
    const totalItems = (arts?.artifacts || []).length;
    const avg = (arts?.artifacts || []).reduce((s, a) => s + (Number(a.price) || 0), 0) / (totalItems || 1);
    const totalEl = document.getElementById('totalItems');
    const avgEl = document.getElementById('avgPrice');
    if (totalEl) totalEl.textContent = String(totalItems);
    if (avgEl) avgEl.textContent = `$${avg.toFixed(0)}`;
  } catch (e) {
    // Non-fatal for static dashboard
  }
}

window.addEventListener('DOMContentLoaded', loadKPIs);
