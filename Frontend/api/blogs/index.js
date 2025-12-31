export default async function handler(req, res) {
  try {
    const backend = process.env.BACKEND_URL || '';
    const useBackend = !!backend;
    global.__PVA_BLOGS__ = global.__PVA_BLOGS__ || [];
    const store = global.__PVA_BLOGS__;
    if (store.length === 0) {
      const seeds = [
        {
          slug: 'welcome',
          title: 'Welcome to PVA Bazaar',
          content:
            '<p>This is your space to write and publish. Use the editor to create your first post.</p>',
          status: 'published',
          updatedAt: new Date().toISOString(),
        },
        {
          slug: 'vision',
          title: 'The Vision',
          content:
            '<p>We believe in transparent craftsmanship, fair trade, and a living archive of thought.</p>',
          status: 'published',
          updatedAt: new Date().toISOString(),
        },
      ];
      seeds.forEach((b) => store.push(b));
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname.replace(/^\/api\/blogs\/?/, '');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();

    if (req.method === 'GET' && (path === '' || path === '/')) {
      if (useBackend) {
        const r = await fetch(`${backend}/api/blogs/`);
        const j = await r.json();
        return res.status(r.status).json(j);
      }
      const blogs = store.map((b) => ({ slug: b.slug, title: b.title, updatedAt: b.updatedAt }));
      return res.status(200).json({ ok: true, blogs });
    }

    // GET a single blog by slug
    if (req.method === 'GET' && path) {
      const slug = path.replace(/\/$/, '');
      if (useBackend) {
        const r = await fetch(`${backend}/api/blogs/${encodeURIComponent(slug)}`);
        const j = await r.json();
        return res.status(r.status).json(j);
      }
      const blog = store.find((b) => b.slug === slug);
      if (!blog) return res.status(404).json({ ok: false, message: 'Blog not found' });
      return res.status(200).json({ ok: true, blog });
    }

    if (req.method === 'POST' && path === 'quick-publish') {
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
      store.push({
        slug,
        title,
        content,
        status: 'published',
        updatedAt: new Date().toISOString(),
      });
      return res.status(200).json({ ok: true, message: 'Blog created and published', slug });
    }

    return res.status(404).json({ ok: false, message: 'Not Found' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || 'Internal error' });
  }
}
