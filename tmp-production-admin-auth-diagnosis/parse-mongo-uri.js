const fs = require('fs');

const txt = fs.readFileSync('backend/.vercel/.env.production.local', 'utf8');
const m = txt.match(/^MONGODB_URI="([^"]+)"/m);
if (!m) {
  console.log(JSON.stringify({ uriMissing: true }, null, 2));
  process.exit(0);
}

const uri = m[1];
let dbPath = '';
try {
  const u = new URL(uri);
  dbPath = u.pathname.replace(/^\//, '');
} catch {}

console.log(JSON.stringify({
  uri,
  dbPath: dbPath || '',
  defaultsToTest: !dbPath,
}, null, 2));
