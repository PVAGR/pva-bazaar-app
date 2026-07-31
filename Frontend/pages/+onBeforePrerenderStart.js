import fetch from 'node-fetch';

const API_URL = process.env.VITE_API_URL || process.env.API_URL || 'https://pva-backend-api.vercel.app/api';

export default async function onBeforePrerenderStart() {
  const urls = [];

  // Archive entries
  try {
    const archiveRes = await fetch(`${API_URL}/archive?limit=500`);
    const archiveData = await archiveRes.json();
    if (archiveData.items) {
      archiveData.items.forEach(entry => {
        if (entry.id) urls.push(`/archive/${entry.id}`);
      });
    }
  } catch {}

  // Marketplace items
  try {
    const itemsRes = await fetch(`${API_URL}/items?limit=500`);
    const itemsData = await itemsRes.json();
    if (itemsData.items) {
      itemsData.items.forEach(item => {
        if (item.slug) urls.push(`/marketplace/${item.slug}`);
      });
    }
  } catch {}

  // Normalize and filter URLs
  const normalized = urls
    .map(u => {
      // Remove query/hash, trailing slash except root
      let url = u.split('?')[0].split('#')[0];
      if (url.length > 1 && url.endsWith('/')) url = url.slice(0, -1);
      return url;
    })
    .filter(u => u && u !== '/');

  // Return only unique, normalized, parameterized URLs
  return Array.from(new Set(normalized));
}
