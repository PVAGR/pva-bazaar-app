// Example of how your API configuration might look
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.pvabazaar.org' // or https://pvabazaar.org/api
  : 'http://localhost:3001';

export const fetchData = async (endpoint) => {
  const response = await fetch(`${API_URL}${endpoint}`);
  return response.json();
};