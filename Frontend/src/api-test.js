// Simple API test for PVA Bazaar
async function testBackendConnection() {
    console.log('Testing backend connection...');
    
    try {
        // Test 1: Health endpoint
        const healthRes = await fetch('http://localhost:3000/api/health');
        console.log('Health check:', healthRes.ok ? '✅ PASS' : '❌ FAIL');
        
        // Test 2: Fetch artifacts
        const artifactsRes = await fetch('http://localhost:3000/api/artifacts');
        if (artifactsRes.ok) {
            const artifacts = await artifactsRes.json();
            console.log(`✅ Loaded ${artifacts.length || 0} artifacts`);
            if (artifacts.length > 0) {
                console.log('First artifact:', artifacts[0].name);
            }
        } else {
            console.log('❌ Failed to fetch artifacts');
        }
    } catch (error) {
        console.error('❌ Connection error:', error.message);
        console.log('Make sure:');
        console.log('1. Backend is running on port 3000');
        console.log('2. CORS is configured in backend');
    }
}

// Run test when page loads
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', testBackendConnection);
}

export { testBackendConnection };
