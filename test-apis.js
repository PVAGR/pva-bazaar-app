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

async function runTests() {
    console.log('=== Testing PVA Bazaar Real-Time Data APIs ===\n');

    await testDashboardAPI();
    console.log('\n' + '='.repeat(50) + '\n');

    await testCryptoAPI();
    console.log('\n' + '='.repeat(50) + '\n');

    await testArtifactsAPI();
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('=== Test Complete ===');
}

runTests();
