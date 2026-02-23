const { MongoClient } = require('mongodb');

// Use MONGODB_URI from environment to avoid hardcoding credentials.
const uri = process.env.MONGODB_URI;

async function test() {
  if (!uri) {
    console.error('❌ Missing MONGODB_URI env var.');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!');

    // Check if we can access the database
    const databases = await client.db().admin().listDatabases();
    console.log(
      'Available databases:',
      databases.databases.map((d) => d.name),
    );
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.close();
  }
}

test();
