module.exports = async (req, res) => {
  // In-memory store (ephemeral in serverless)
  global.__PVA_BLOGS__ = global.__PVA_BLOGS__ || [];
  const store = global.__PVA_BLOGS__;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/blogs\/?/, '');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET' && (path === '' || path === '/')) {
    const blogs = store.map((b) => ({ slug: b.slug, title: b.title, updatedAt: b.updatedAt }));
    return res.status(200).json({ ok: true, blogs });
  }

  if (req.method === 'POST' && path === 'quick-publish') {
    try {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      await new Promise((resolve) => req.on('end', resolve));
      const payload = JSON.parse(body || '{}');
      const slug = (payload.slug || '').trim().toLowerCase();
      const title = (payload.title || '').trim();
      const content = (payload.content || '').toString();
      if (!slug || !title)
        return res.status(400).json({ ok: false, message: 'slug and title are required' });

      const existing = store.find((b) => b.slug === slug);
      if (existing) {
        existing.title = title || existing.title;
        existing.content = content;
        existing.updatedAt = new Date().toISOString();
        return res.status(200).json({ ok: true, message: 'Blog updated and published', slug });
      }
      store.push({
        slug,
        title,
        content,
        status: 'published',
        updatedAt: new Date().toISOString(),
      });
      return res.status(200).json({ ok: true, message: 'Blog created and published', slug });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message || 'Internal error' });
    }
  }

  return res.status(404).json({ ok: false, message: 'Not Found' });
};
