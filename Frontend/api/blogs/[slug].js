export default async function handler(req, res) {
  try {
    const backend = process.env.BACKEND_URL || '';
    const useBackend = !!backend;
    global.__PVA_BLOGS__ = global.__PVA_BLOGS__ || [];
    const store = global.__PVA_BLOGS__;
    if (store.length === 0) {
      const seeds = [
        { slug: 'welcome', title: 'Welcome to PVA Bazaar', content: '<p>This is your space to write and publish. Use the editor to create your first post.</p>', status: 'published', updatedAt: new Date().toISOString() },
        { slug: 'vision', title: 'The Vision', content: '<p>We believe in transparent craftsmanship, fair trade, and a living archive of thought.</p>', status: 'published', updatedAt: new Date().toISOString() }
      ];
      seeds.forEach(b => store.push(b));
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Method not allowed' });

    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.split('/');
    const slug = decodeURIComponent(parts[parts.length - 1] || '').toLowerCase();
    if (useBackend) {
      const r = await fetch(`${backend}/api/blogs/${encodeURIComponent(slug)}`);
      const j = await r.json();
      return res.status(r.status).json(j);
    }
    const blog = store.find(b => b.slug === slug);
    if (!blog) return res.status(404).json({ ok: false, message: 'Blog not found' });
    return res.status(200).json({ ok: true, blog });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || 'Internal error' });
  }
}
