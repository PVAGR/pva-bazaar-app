"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [shop, setShop] = useState<ShopData["shop"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

  const getToken = () => localStorage.getItem("authToken");

  useEffect(() => {
    const fetchShop = async () => {
      const token = getToken();
      if (!token) {
        setError("Sign in required to manage shop settings.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/api/shops/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to load shop");

        const data = await response.json();
        setShop(data.shop);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shop");
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, [API_BASE]);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!shop) return;

      const token = getToken();
      if (!token) {
        setError("Sign in required to save shop settings.");
        return;
      }

      setSaving(true);
      setError(null);
      setNotice(null);

      try {
        const response = await fetch(`${API_BASE}/api/shops/${shop.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(shop),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Failed to save shop");

        setNotice(payload?.message || "Shop settings saved.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [API_BASE, shop]
  );

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center py-24">
        <div
          role="status"
          aria-label="Loading shop settings"
          className="h-12 w-12 animate-spin rounded-full border-b-2 border-amber-300"
        />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-3 py-24 text-center">
        {error ? (
          <div className="rounded-lg border border-red-700/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : (
          <p className="text-zinc-400">
            You don&apos;t have a shop yet. Create one from the main application
            once you&apos;ve completed your trader profile.
          </p>
        )}
        <a
          href="/get-started"
          className="text-xs text-amber-300 hover:text-amber-200"
        >
          Return to Get Started
        </a>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-300/60";
  const labelClass =
    "mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500";

  return (
    <section className="flex w-full flex-col gap-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
          Seller Settings
        </p>
        <h1 className="text-2xl font-semibold text-zinc-100 md:text-3xl">
          Shop Settings
        </h1>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-700/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-emerald-300">
          {notice}
        </p>
      ) : null}

      <form
        onSubmit={handleSave}
        className="rounded-lg border border-zinc-800/80 bg-zinc-950/60"
      >
        <div className="space-y-8 p-6">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-100">
              Basic Information
            </h2>
            <div>
              <label htmlFor="shop-name" className={labelClass}>
                Shop Name
              </label>
              <input
                id="shop-name"
                type="text"
                value={shop.shopName}
                onChange={(e) =>
                  setShop({ ...shop, shopName: e.target.value })
                }
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="shop-description" className={labelClass}>
                Description
              </label>
              <textarea
                id="shop-description"
                value={shop.description}
                onChange={(e) =>
                  setShop({ ...shop, description: e.target.value })
                }
                className={`${inputClass} h-24`}
                placeholder="Tell customers what you sell..."
              />
            </div>
            <div>
              <label htmlFor="shop-story" className={labelClass}>
                Your Story
              </label>
              <textarea
                id="shop-story"
                value={shop.story}
                onChange={(e) => setShop({ ...shop, story: e.target.value })}
                className={`${inputClass} h-24`}
                placeholder="Share your artisan story, tradition, or mission..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-100">
              Categories &amp; Tags
            </h2>
            <div>
              <label htmlFor="shop-tags" className={labelClass}>
                Tags (comma-separated)
              </label>
              <input
                id="shop-tags"
                type="text"
                value={shop.tags.join(", ")}
                onChange={(e) =>
                  setShop({
                    ...shop,
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
                className={inputClass}
                placeholder="e.g., handmade, organic, fair-trade"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-100">
              Contact &amp; Policies
            </h2>
            <div>
              <label htmlFor="shop-contact" className={labelClass}>
                Contact Message
              </label>
              <textarea
                id="shop-contact"
                value={shop.contactMessage}
                onChange={(e) =>
                  setShop({ ...shop, contactMessage: e.target.value })
                }
                className={`${inputClass} h-16`}
                placeholder="How should customers contact you?"
              />
            </div>
            <div>
              <label htmlFor="shop-shipping" className={labelClass}>
                Shipping Policy
              </label>
              <textarea
                id="shop-shipping"
                value={shop.shippingPolicy}
                onChange={(e) =>
                  setShop({ ...shop, shippingPolicy: e.target.value })
                }
                className={`${inputClass} h-16`}
              />
            </div>
            <div>
              <label htmlFor="shop-returns" className={labelClass}>
                Returns Policy
              </label>
              <textarea
                id="shop-returns"
                value={shop.returnsPolicy}
                onChange={(e) =>
                  setShop({ ...shop, returnsPolicy: e.target.value })
                }
                className={`${inputClass} h-16`}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-100">
              Social Links
            </h2>
            <div>
              <label htmlFor="shop-instagram" className={labelClass}>
                Instagram
              </label>
              <input
                id="shop-instagram"
                type="url"
                value={shop.socialLinks?.instagram || ""}
                onChange={(e) =>
                  setShop({
                    ...shop,
                    socialLinks: {
                      ...shop.socialLinks,
                      instagram: e.target.value,
                    },
                  })
                }
                className={inputClass}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <label htmlFor="shop-website" className={labelClass}>
                Website
              </label>
              <input
                id="shop-website"
                type="url"
                value={shop.socialLinks?.website || ""}
                onChange={(e) =>
                  setShop({
                    ...shop,
                    socialLinks: {
                      ...shop.socialLinks,
                      website: e.target.value,
                    },
                  })
                }
                className={inputClass}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4 border-t border-zinc-800/80 p-6">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-6 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/20 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-6 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
