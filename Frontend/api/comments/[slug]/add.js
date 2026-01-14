export default async function handler(req, res) {
  try {
    const backend = process.env.BACKEND_URL || '';
    const useBackend = !!backend;
    global.__PVA_COMMENTS__ = global.__PVA_COMMENTS__ || {};
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST')
      return res.status(405).json({ ok: false, message: 'Method not allowed' });

    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.split('/');
    const slug = decodeURIComponent(parts[parts.length - 2] || '').toLowerCase();

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    await new Promise((resolve) => req.on('end', resolve));
    const payload = JSON.parse(body || '{}');
    const authorName = (payload.authorName || '').toString().trim() || 'Anonymous';
    const content = (payload.body || '').toString();
    if (!content) return res.status(400).json({ ok: false, message: 'Empty comment' });

    if (useBackend) {
      const r = await fetch(`${backend}/api/comments/${encodeURIComponent(slug)}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName, body: content }),
      });
      const j = await r.json();
      return res.status(r.status).json(j);
    }

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
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || 'Internal error' });
  }
}
