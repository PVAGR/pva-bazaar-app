// Example of how your API configuration might look
const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://pva-backend-api.vercel.app';

export const fetchData = async (endpoint) => {
  const response = await fetch(`${API_URL}${endpoint}`);
  return response.json();
};
