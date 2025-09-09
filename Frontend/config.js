// Frontend configuration for PVA Bazaar
// This will be automatically updated during deployment
const config = {
  // Default to local development API
  apiUrl: '/api'
};

// Production API URL will be set during deployment
if (typeof window !== 'undefined' && window.__VERCEL_API_URL__) {
  config.apiUrl = window.__VERCEL_API_URL__ + '/api';
}

export default config;