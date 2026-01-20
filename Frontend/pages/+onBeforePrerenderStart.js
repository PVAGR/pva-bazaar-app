import fetch from 'node-fetch';

const API_URL = process.env.VITE_API_URL || process.env.API_URL || 'https://pvabazaar.org/api';

export default async function onBeforePrerenderStart() {
  const urls = ['/archive', '/marketplace', '/admin', '/admin/orders'];
  // '/' will be added at the end if not present

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

  // Remove duplicates and ensure '/' is only present once at the start
  const filtered = urls.filter(u => u && u !== '/');
  return ['/', ...Array.from(new Set(filtered))];
}
