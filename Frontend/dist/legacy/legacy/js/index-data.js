import { getArtifacts } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('latest-artifacts');
  if (!container) return;
  try {
    const artifacts = await getArtifacts(4);
    if (!artifacts || artifacts.length === 0) {
      container.style.display = 'none';
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'writings-grid';
    artifacts.forEach((a) => {
      const card = document.createElement('div');
      card.className = 'writing-card';

      const h3 = document.createElement('h3');
      h3.textContent = a.title || a.name || 'Artifact';

      const p = document.createElement('p');
      p.textContent = a.description || '';

      const link = document.createElement('a');
      const id = a._id || a.id || '';
      link.href = id ? `/pages/productshowcase.html?id=${encodeURIComponent(id)}` : '#';
      link.textContent = 'View Artifact';

      card.appendChild(h3);
      card.appendChild(p);
      card.appendChild(link);
      grid.appendChild(card);
    });

    container.appendChild(grid);
    container.style.display = '';
  } catch (err) {
    // If API is unavailable, keep the page clean and hide the section
    container.style.display = 'none';
  }
});
