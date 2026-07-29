'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ShopData {
  shop: {
    id: string;
    shopName: string;
    description: string;
    story: string;
    bannerUrl: string;
    logoUrl: string;
    tags: string[];
    categories: string[];
    socialLinks: {
      instagram: string;
      twitter: string;
      website: string;
    };
    shippingPolicy: string;
    returnsPolicy: string;
    contactMessage: string;
    status: string;
  };
}

export default function SellerSettings() {
  const router = useRouter();
  const [shop, setShop] = useState<ShopData['shop'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/shops/me`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        });

        if (!response.ok) throw new Error('Failed to load shop');

        const data = await response.json();
        setShop(data.shop);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load shop');
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/shops/${shop.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(shop),
      });

      if (!response.ok) throw new Error('Failed to save shop');

      alert('Shop settings saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">You don&apos;t have a shop yet.</p>
          {/* TODO: Replace with working link to /seller/create when that page exists */}
          <span className="inline-block bg-zinc-400 text-white px-4 py-2 rounded cursor-not-allowed">
            Create Shop — coming soon
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shop Settings</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h3>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Shop Name
                </label>
                <input
                  type="text"
                  value={shop.shopName}
                  onChange={(e) => setShop({ ...shop, shopName: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={shop.description}
                  onChange={(e) => setShop({ ...shop, description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-24"
                  placeholder="Tell customers what you sell..."
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Story
                </label>
                <textarea
                  value={shop.story}
                  onChange={(e) => setShop({ ...shop, story: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-24"
                  placeholder="Share your artisan story, tradition, or mission..."
                />
              </div>
            </div>

            {/* Categories & Tags */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Categories & Tags</h3>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={shop.tags.join(', ')}
                  onChange={(e) => setShop({ ...shop, tags: e.target.value.split(',').map(t => t.trim()) })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g., handmade, organic, fair-trade"
                />
              </div>
            </div>

            {/* Contact & Policies */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Contact & Policies</h3>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Message
                </label>
                <textarea
                  value={shop.contactMessage}
                  onChange={(e) => setShop({ ...shop, contactMessage: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-16"
                  placeholder="How should customers contact you?"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Shipping Policy
                </label>
                <textarea
                  value={shop.shippingPolicy}
                  onChange={(e) => setShop({ ...shop, shippingPolicy: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-16"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Returns Policy
                </label>
                <textarea
                  value={shop.returnsPolicy}
                  onChange={(e) => setShop({ ...shop, returnsPolicy: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-16"
                />
              </div>
            </div>

            {/* Social Links */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Social Links</h3>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Instagram
                </label>
                <input
                  type="url"
                  value={shop.socialLinks?.instagram || ''}
                  onChange={(e) => setShop({
                    ...shop,
                    socialLinks: { ...shop.socialLinks, instagram: e.target.value }
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="https://instagram.com/..."
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={shop.socialLinks?.website || ''}
                  onChange={(e) => setShop({
                    ...shop,
                    socialLinks: { ...shop.socialLinks, website: e.target.value }
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="p-6 border-t border-gray-200 flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
