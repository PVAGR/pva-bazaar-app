const { MongoClient } = require('mongodb');

// Use the same connection string from your .env file
const uri = "mongodb+srv://pvaglobalreach_db_user:YOUR_PASSWORD@cluster0.vyhnsiy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function test() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!');
    
    // Check if we can access the database
    const databases = await client.db().admin().listDatabases();
    console.log('Available databases:', databases.databases.map(d => d.name));
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.close();
  }
}

test();