// Example API connection file
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://pva-bazaar-app-1.onrender.com/api';

export async function fetchProducts() {
  const response = await fetch(`${API_URL}/products`);
  return response.json();
}
