require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const dns = require('dns').promises;
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
console.log('=== MongoDB Deep Diagnostic ===\n');
console.log('URI (masked):', uri?.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'));

const hostname = uri?.match(/@([^/?]+)/)?.[1];
console.log('Target hostname:', hostname);

async function diagnose() {
  // Step 1: DNS SRV check (for mongodb+srv)
  if (uri?.startsWith('mongodb+srv://')) {
    const srvHost = `_mongodb._tcp.${  hostname}`;
    console.log(`\n--- DNS SRV Lookup: ${srvHost} ---`);
    try {
      const addresses = await dns.resolveSrv(srvHost);
      console.log('SRV resolved:', JSON.stringify(addresses, null, 2));
    } catch (err) {
      console.error('SRV FAILED:', err.code, '-', err.message);
    }

    // Also try TXT for connection options
    try {
      const txt = await dns.resolveTxt(hostname);
      console.log('TXT records:', JSON.stringify(txt));
    } catch (err) {
      console.error('TXT lookup failed:', err.code);
    }
  }

  // Step 2: A record check
  console.log(`\n--- DNS A Record Lookup: ${hostname} ---`);
  try {
    const addresses = await dns.resolve4(hostname);
    console.log('A records:', addresses);
  } catch (err) {
    console.error('A record FAILED:', err.code, '-', err.message);
  }

  // Step 3: Try Google DNS explicitly
  console.log('\n--- DNS via Google 8.8.8.8 ---');
  const origServers = dns.getServers();
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  try {
    const a = await dns.resolve4(hostname);
    console.log('A records (Google DNS):', a);
  } catch (err) {
    console.error('A record (Google DNS) FAILED:', err.code, '-', err.message);
  }
  dns.setServers(origServers);

  // Step 4: TCP connectivity check
  if (uri?.startsWith('mongodb+srv://')) {
    console.log('\n--- MongoDB Driver Connection Test ---');
    console.log('Attempting client.connect() with 15s timeout...');
  } else {
    // Extract port from non-SRV URI
    const portMatch = uri?.match(/:(\d+)\//);
    const port = portMatch ? parseInt(portMatch[1]) : 27017;
    console.log(`\n--- TCP Connectivity: ${hostname}:${port} ---`);
    const net = require('net');
    await new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(10000);
      socket.connect(port, hostname, () => {
        console.log(`TCP ${hostname}:${port} - CONNECTED`);
        socket.destroy();
        resolve();
      });
      socket.on('error', (err) => {
        console.error(`TCP ${hostname}:${port} - FAILED:`, err.message);
        resolve();
      });
      socket.on('timeout', () => {
        console.error(`TCP ${hostname}:${port} - TIMEOUT`);
        socket.destroy();
        resolve();
      });
    });
  }

  // Step 5: MongoClient attempt
  console.log('\n--- MongoClient Connection Attempt ---');
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 15000,
  });

  try {
    console.log('Connecting...');
    await client.connect();
    console.log('CONNECTED');

    const admin = client.db().admin();
    const info = await admin.serverStatus();
    console.log('MongoDB version:', info.version);
    console.log('Host:', info.host);

    const collections = await client.db('pvabazaar').listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name).join(', ') || '(none)');

    console.log('\n=== RESULT: SUCCESS ===');
  } catch (error) {
    console.error('\n=== RESULT: FAILED ===');
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    if (error.message.includes('ENOTFOUND') || error.message.includes('querySrv')) {
      console.error('\n>>> ROOT CAUSE: DNS RESOLUTION FAILED');
      console.error(`The hostname "${  hostname  }" does not resolve.`);
      console.error('This means the MongoDB Atlas cluster does not exist, is deleted,');
      console.error('or the cluster name in the connection string is wrong.');
      console.error('Action: Go to MongoDB Atlas → Clusters and verify the exact cluster name.');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n>>> ROOT CAUSE: CONNECTION REFUSED');
      console.error('The host exists but is not accepting connections on the expected port.');
      console.error('Check if the cluster is paused in MongoDB Atlas.');
    } else if (error.message.includes('whitelist') || error.message.includes('IP') || error.message.includes('not allowed')) {
      console.error('\n>>> ROOT CAUSE: IP NOT WHITELISTED');
      console.error('Add 0.0.0.0/0 in MongoDB Atlas → Security → Network Access.');
    } else if (error.message.includes('authentication') || error.name === 'MongoServerError') {
      console.error('\n>>> ROOT CAUSE: AUTHENTICATION FAILED');
      console.error('Check username and password in the connection string.');
    } else if (error.message.includes('TLS') || error.message.includes('SSL')) {
      console.error('\n>>> ROOT CAUSE: TLS/SSL ERROR');
      console.error('SSL certificate verification failed. Try ssl=true in connection string.');
    } else {
      console.error('\n>>> UNKNOWN ERROR - full stack:');
      console.error(error.stack);
    }
  } finally {
    await client.close();
    process.exit(0);
  }
}

diagnose();
