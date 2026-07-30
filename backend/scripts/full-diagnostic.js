const dnsModule = require('dns');
dnsModule.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

console.log('=== FULL MONGODB DIAGNOSTIC ===\n');
console.log('(DNS forced to Google 8.8.8.8 / Cloudflare 1.1.1.1)\n');

const uri = process.env.MONGODB_URI;
console.log('1. Connection String Check:');
console.log('   URI present:', !!uri);
console.log('   URI (masked):', uri?.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'));

const hostnameMatch = uri?.match(/@([^/?]+)/);
const hostname = hostnameMatch?.[1];
console.log('   Hostname:', hostname);

const suffix = hostname?.split('.').slice(0, -3).join('.');
console.log('   Cluster suffix:', suffix);

const isSrv = uri?.startsWith('mongodb+srv://');
console.log('   Protocol:', isSrv ? 'mongodb+srv (SRV)' : 'mongodb (direct)');

console.log('\n2. DNS Resolution Test:');
const dns = require('dns').promises;

async function testDNS() {
  let allOk = true;

  if (isSrv) {
    const srvHost = `_mongodb._tcp.${  hostname}`;
    process.stdout.write(`   SRV ${  srvHost  } ... `);
    try {
      const srv = await dns.resolveSrv(srvHost);
      console.log(`OK (${  srv.length  } records)`);
      srv.forEach(r => console.log(`     ${  r.name  }:${  r.port  } pri=${  r.priority  } wei=${  r.weight}`));
    } catch (err) {
      console.error('FAILED:', err.code);
      allOk = false;
    }

    process.stdout.write(`   TXT ${  hostname  } ... `);
    try {
      const txt = await dns.resolveTxt(hostname);
      console.log('OK:', txt.map(t => t.join('')).join(', '));
    } catch (err) {
      console.log(`failed (${  err.code  }) — non-critical`);
    }
  }

  process.stdout.write(`   A   ${  hostname  } ... `);
  try {
    const a = await dns.resolve4(hostname);
    console.log('OK:', a.join(', '));
  } catch (err) {
    console.error('FAILED:', err.code);
    allOk = false;
  }

  console.log('\n   --- Google DNS 8.8.8.8 ---');
  const orig = dns.getServers();
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  try {
    const a = await dns.resolve4(hostname);
    console.log('   A (Google):', a.join(', '));
  } catch (err) {
    console.error('   A (Google) FAILED:', err.code);
    allOk = false;
  }
  if (isSrv) {
    try {
      const srv = await dns.resolveSrv(`_mongodb._tcp.${  hostname}`);
      console.log('   SRV (Google):', srv.length, 'records');
    } catch (err) {
      console.error('   SRV (Google) FAILED:', err.code);
      allOk = false;
    }
  }
  dns.setServers(orig);

  return allOk;
}

async function testMongo() {
  const { MongoClient } = require('mongodb');
  console.log('\n3. TCP + MongoClient Test:');

  if (!isSrv) {
    const portMatch = uri?.match(/:(\d+)\//);
    const port = portMatch ? parseInt(portMatch[1]) : 27017;
    const net = require('net');
    process.stdout.write(`   TCP ${  hostname  }:${  port  } ... `);
    await new Promise(resolve => {
      const sock = new net.Socket();
      sock.setTimeout(8000);
      sock.connect(port, hostname, () => { console.log('CONNECTED'); sock.destroy(); resolve(); });
      sock.on('error', e => { console.error('FAILED:', e.message); sock.destroy(); resolve(); });
      sock.on('timeout', () => { console.error('TIMEOUT'); sock.destroy(); resolve(); });
    });
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 30000,
  });

  try {
    process.stdout.write('   Connecting ... ');
    await client.connect();
    console.log('CONNECTED');

    const admin = client.db().admin();
    const info = await admin.serverStatus();
    console.log('   Version:', info.version);
    console.log('   Host:', info.host);

    const dbs = await admin.listDatabases();
    console.log('   Databases:', dbs.databases.map(d => d.name).join(', '));

    try {
      const cols = await client.db('pvabazaar').listCollections().toArray();
      console.log('   pvabazaar collections:', cols.length ? cols.map(c => c.name).join(', ') : '(empty)');
    } catch (e) {
      console.log(`   pvabazaar db: not accessible (${  e.message  })`);
    }

    console.log('\n=== RESULT: SUCCESS ===');
    return true;
  } catch (error) {
    console.error('FAILED');
    console.error('   Error:', error.name);
    console.error('   Code:', error.code);
    console.error('   Message:', error.message?.substring(0, 500));

    if (error.message?.includes('ENOTFOUND') || error.message?.includes('querySrv')) {
      console.error('\n   >>> ROOT CAUSE: DNS RESOLUTION FAILED');
      console.error(`   Hostname "${  hostname  }" does not exist in DNS.`);
      console.error('   Go to Atlas → Cluster0 → Connect → Drivers and copy the exact string.');
    } else if (error.message?.includes('ECONNREFUSED')) {
      console.error('\n   >>> ROOT CAUSE: CONNECTION REFUSED');
      console.error('   Host exists but port is closed. Is the cluster paused?');
    } else if (error.message?.includes('whitelist') || error.message?.includes('not allowed') || error.message?.includes('IP')) {
      console.error('\n   >>> ROOT CAUSE: IP NOT WHITELISTED');
      console.error('   Add 0.0.0.0/0 in Atlas → Security → Network Access.');
    } else if (error.message?.includes('Authentication failed') || error.name === 'MongoServerError') {
      console.error('\n   >>> ROOT CAUSE: AUTH FAILED');
      console.error('   Wrong username or password. Check Atlas → Database Access.');
    } else if (error.message?.includes('TLS') || error.message?.includes('SSL')) {
      console.error('\n   >>> ROOT CAUSE: TLS ERROR');
    } else if (error.message?.includes('Server selection timed out')) {
      console.error('\n   >>> ROOT CAUSE: SERVER SELECTION TIMEOUT');
      console.error('   Cluster may be paused, starting up, or network blocked.');
    }

    console.error('\n   Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2).substring(0, 1000));
    return false;
  } finally {
    await client.close();
  }
}

async function main() {
  console.log('\n   --- Local DNS ---');
  let dnsOk = true;
  try {
    if (isSrv) {
      const srv = await dns.resolveSrv(`_mongodb._tcp.${  hostname}`);
      console.log(`   SRV: OK (${  srv.length  } records)`);
    }
  } catch (e) {
    console.log(`   SRV: FAILED (${  e.code  })`);
    dnsOk = false;
  }
  try {
    const a = await dns.resolve4(hostname);
    console.log(`   A:   OK (${  a.join(', ')  })`);
  } catch (e) {
    console.log(`   A:   FAILED (${  e.code  })`);
    dnsOk = false;
  }

  const mongoOk = await testMongo();

  console.log('\n=== SUMMARY ===');
  console.log('DNS:', dnsOk ? 'OK' : 'FAILED');
  console.log('MongoDB:', mongoOk ? 'OK' : 'FAILED');

  if (!dnsOk || !mongoOk) {
    console.log('\n>>> ACTION REQUIRED:');
    if (!dnsOk) {
      console.log('1. Open MongoDB Atlas in your browser');
      console.log('2. Go to Cluster0 → Connect → Drivers');
      console.log('3. Copy the connection string EXACTLY');
      console.log('4. Pay attention to every character — especially l vs 1, O vs 0');
      console.log('5. Update MONGODB_URI in Vercel AND backend/.env');
    } else {
      console.log('DNS resolves but connection fails. Check:');
      console.log('- IP whitelist in Atlas (need 0.0.0.0/0)');
      console.log('- Username/password in Atlas → Database Access');
      console.log('- Cluster status (must be Active, not Paused)');
    }
  }

  process.exit(mongoOk ? 0 : 1);
}

main();
