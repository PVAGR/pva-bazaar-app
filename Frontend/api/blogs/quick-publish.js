export default async function handler(req, res) {
  try {
    const backend = process.env.BACKEND_URL || '';
    const useBackend = !!backend;
    global.__PVA_BLOGS__ = global.__PVA_BLOGS__ || [];
    const store = global.__PVA_BLOGS__;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST')
      return res.status(405).json({ ok: false, message: 'Method not allowed' });

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    await new Promise((resolve) => req.on('end', resolve));
    const payload = JSON.parse(body || '{}');

    const slug = (payload.slug || '').toString().trim().toLowerCase();
    const title = (payload.title || '').toString().trim();
    const content = (payload.content || '').toString();
    if (!slug || !title)
      return res.status(400).json({ ok: false, message: 'slug and title are required' });

    if (useBackend) {
      const r = await fetch(`${backend}/api/blogs/quick-publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, title, content }),
      });
      const j = await r.json();
      return res.status(r.status).json(j);
    }

    const existing = store.find((b) => b.slug === slug);
    if (existing) {
      existing.title = title || existing.title;
      existing.content = content;
      existing.updatedAt = new Date().toISOString();
      return res.status(200).json({ ok: true, message: 'Blog updated and published', slug });
    }

    store.push({ slug, title, content, status: 'published', updatedAt: new Date().toISOString() });
    return res.status(200).json({ ok: true, message: 'Blog created and published', slug });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || 'Internal error' });
  }
}
