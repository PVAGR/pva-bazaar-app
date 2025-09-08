// Example API connection file
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function fetchProducts() {
  const response = await fetch(`${API_URL}/products`);
  return response.json();
}