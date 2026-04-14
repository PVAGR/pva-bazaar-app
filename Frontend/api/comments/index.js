export default async function handler(req, res) {
  try {
    global.__PVA_COMMENTS__ = global.__PVA_COMMENTS__ || {};

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname.replace(/^\/api\/comments\/?/, '');

    // List comments: GET /api/comments/:slug
    if (req.method === 'GET') {
      const slug = path.replace(/\/$/, '');
      if (!slug) return res.status(400).json({ ok: false, message: 'Missing slug' });
      const list = Array.isArray(global.__PVA_COMMENTS__[slug])
        ? global.__PVA_COMMENTS__[slug]
        : [];
      return res.status(200).json({ ok: true, comments: list });
    }

    // Add comment: POST /api/comments/:slug/add
    if (req.method === 'POST') {
      if (!path.endsWith('/add')) return res.status(404).json({ ok: false, message: 'Not Found' });
      const slug = path.replace(/\/add$/, '').replace(/\/$/, '');
      if (!slug) return res.status(400).json({ ok: false, message: 'Missing slug' });

      // Parse JSON body
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      await new Promise((resolve) => req.on('end', resolve));
      const payload = JSON.parse(body || '{}');

      const authorName = (payload.authorName || '').toString().trim() || 'Anonymous';
      const content = (payload.body || '').toString();
      if (!content) return res.status(400).json({ ok: false, message: 'Empty comment' });

      const entry = {
        blogSlug: slug,
        authorName,
        body: content,
        createdAt: new Date().toISOString(),
        approved: true,
      };
      global.__PVA_COMMENTS__[slug] = global.__PVA_COMMENTS__[slug] || [];
      global.__PVA_COMMENTS__[slug].unshift(entry);

      return res.status(200).json({ ok: true, message: 'Comment posted', comment: entry });
    }

    return res.status(404).json({ ok: false, message: 'Not Found' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || 'Internal error' });
  }
}
