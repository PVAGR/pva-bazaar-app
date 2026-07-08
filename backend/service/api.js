// Example API connection file
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://pva-backend-api.vercel.app/api';

export async function fetchProducts() {
  const response = await fetch(`${API_URL}/products`);
  return response.json();
}
