'use client';

import { useEffect, useState } from 'react';

interface DashboardData {
  shop: {
    id: string;
    name: string;
    slug: string;
    status: string;
    views: number;
    followers: number;
  };
  stats: {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    pendingPayouts: number;
    avgRating: number;
    reviewCount: number;
  };
  recentOrders: Array<{
    id: string;
    date: string;
    buyer: string;
    item: string;
    amount: number;
    status: string;
  }>;
}

export default function SellerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/seller/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load dashboard');
        }

        const data = await response.json();
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 text-center">
          <p className="text-xl font-bold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const revenueFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{data.shop.name}</h1>
          <p className="text-gray-600 mt-1">Shop Status: <span className="font-semibold capitalize">{data.shop.status}</span></p>
          {data.shop.status === 'draft' && (
            <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Publish Shop
            </button>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-sm font-semibold">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {revenueFormatter.format(data.stats.totalRevenue / 100)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-sm font-semibold">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{data.stats.totalOrders}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-sm font-semibold">Products</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{data.stats.totalProducts}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-sm font-semibold">Followers</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{data.shop.followers}</p>
          </div>
        </div>

        {/* Shop Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Shop Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Shop Views</span>
                <span className="font-semibold">{data.shop.views}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Rating</span>
                <span className="font-semibold">{data.stats.avgRating.toFixed(1)}⭐</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reviews</span>
                <span className="font-semibold">{data.stats.reviewCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Pending</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Payouts Ready</span>
                <span className="font-semibold text-blue-600">{data.stats.pendingPayouts}</span>
              </div>
              <a href="/seller/analytics" className="text-blue-600 hover:underline text-sm">
                View Full Analytics →
              </a>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Buyer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {new Date(order.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">{order.buyer}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">{order.item}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                      {revenueFormatter.format(order.amount / 100)}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 border-t border-gray-200">
            <a href="/seller/orders" className="text-blue-600 hover:underline text-sm">
              View All Orders →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
