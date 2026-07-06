/**
 * Lists Render services (id, name, url) for the account behind RENDER_API_KEY.
 *
 *   set RENDER_API_KEY=...   (Windows cmd)
 *   node scripts/list-render-services.mjs
 */
import https from 'https';

const token = process.env.RENDER_API_KEY;
if (!token) {
  console.error('Set RENDER_API_KEY');
  process.exit(1);
}

function get(path) {
  return new Promise((resolve, reject) => {
    https
      .request(
        {
          hostname: 'api.render.com',
          path,
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        },
        (res) => {
          let b = '';
          res.on('data', (c) => (b += c));
          res.on('end', () => {
            if (res.statusCode >= 400) reject(new Error(`${res.statusCode} ${b}`));
            else resolve(JSON.parse(b));
          });
        },
      )
      .on('error', reject)
      .end();
  });
}

const rows = [];
let cursor = null;
for (;;) {
  let p = `/v1/services?limit=100`;
  if (cursor) p += `&cursor=${encodeURIComponent(cursor)}`;
  const chunk = await get(p);
  if (!Array.isArray(chunk) || chunk.length === 0) break;

  for (const item of chunk) {
    const s = item.service || item;
    if (!s || !s.id) continue;
    const url = s.serviceDetails?.url || '';
    rows.push({ id: s.id, name: s.name || '', type: s.type || '', url });
  }

  const last = chunk[chunk.length - 1];
  cursor = last?.cursor || null;
  if (!cursor) break;
}

for (const r of rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''))) {
  console.log(`${r.id}\t${r.name}\t${r.type}\t${r.url}`);
}
