export default async function handler(req, res) {
  try {
    const backend = process.env.BACKEND_URL || '';
    const useBackend = !!backend;
    global.__PVA_COMMENTS__ = global.__PVA_COMMENTS__ || {};
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Method not allowed' });

    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.split('/');
    const slug = decodeURIComponent(parts[parts.length - 1] || '').toLowerCase();
    if (useBackend) {
      const r = await fetch(`${backend}/api/comments/${encodeURIComponent(slug)}`);
      const j = await r.json();
      return res.status(r.status).json(j);
    }
    const list = Array.isArray(global.__PVA_COMMENTS__[slug]) ? global.__PVA_COMMENTS__[slug] : [];
    return res.status(200).json({ ok: true, comments: list });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || 'Internal error' });
  }
}
