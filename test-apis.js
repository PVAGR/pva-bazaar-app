const fetch = require('node-fetch');

async function testDashboardAPI() {
  try {
    console.log('Testing Dashboard API...');
    const response = await fetch('http://localhost:5000/api/dashboard/stats');
    const data = await response.json();
    console.log('Dashboard API Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Dashboard API Error:', error.message);
  }
}

async function testCryptoAPI() {
  try {
    console.log('Testing Crypto API...');
    const response = await fetch('http://localhost:5000/api/market/crypto');
    const data = await response.json();
    console.log('Crypto API Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Crypto API Error:', error.message);
  }
}

async function testArtifactsAPI() {
  try {
    console.log('Testing Artifacts API...');
    const response = await fetch('http://localhost:5000/api/artifacts');
    const data = await response.json();
    console.log('Artifacts API Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Artifacts API Error:', error.message);
  }
}

async function testBlogsAPI() {
  try {
    console.log('Testing Blogs API...');
    // Quick publish a test blog
    const publishRes = await fetch('http://localhost:5000/api/blogs/quick-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'api-test',
        title: 'API Test',
        content: 'Hello from test runner',
      }),
    });
    const publishData = await publishRes.json();
    console.log('Publish Response:', JSON.stringify(publishData, null, 2));

    // Fetch the blog
    const getRes = await fetch('http://localhost:5000/api/blogs/api-test');
    const getData = await getRes.json();
    console.log('Get Blog Response:', JSON.stringify(getData, null, 2));
  } catch (error) {
    console.error('Blogs API Error:', error.message);
  }
}

async function runTests() {
  console.log('=== Testing PVA Bazaar Real-Time Data APIs ===\n');

  await testDashboardAPI();
  console.log(`\n${'='.repeat(50)}\n`);

  await testCryptoAPI();
  console.log(`\n${'='.repeat(50)}\n`);

  await testArtifactsAPI();
  console.log(`\n${'='.repeat(50)}\n`);

  await testBlogsAPI();
  console.log(`\n${'='.repeat(50)}\n`);

  console.log('=== Test Complete ===');
}

runTests();
