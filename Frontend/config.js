const config = {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? 'https://pvabazaar.org/api' 
    : 'http://localhost:5000/api'
};

export default config;