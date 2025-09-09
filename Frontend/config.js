// Dev uses Vite proxy (/api). Production should point to your deployed API.
const config = {
  apiUrl: (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production')
    ? (typeof window !== 'undefined' && window?.__API_BASE__) || 'https://pvabazaar.org/api'
    : '/api'
};

export default config;