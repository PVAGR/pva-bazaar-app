"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

  const getToken = () => localStorage.getItem("authToken");

  const fetchDashboard = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("Sign in required to view the seller dashboard.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/seller/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(response.status === 401 ? "Session expired. Sign in again." : "Failed to load dashboard");
      }
      const payload = await response.json();
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  async function handlePublish() {
    const token = getToken();
    if (!token || !data?.shop?.id) return;
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`${API_BASE}/api/shops/${data.shop.id}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to publish shop");
      setNotice(payload?.message || "Shop published.");
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish shop");
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center py-24">
        <div
          role="status"
          aria-label="Loading seller dashboard"
          className="h-12 w-12 animate-spin rounded-full border-b-2 border-amber-300"
        />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="rounded-lg border border-red-700/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
        <a
          href="/get-started"
          className="text-xs text-amber-300 hover:text-amber-200"
        >
          Return to Get Started
        </a>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const revenueFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      delivered: "bg-emerald-500/15 text-emerald-300",
      shipped: "bg-amber-500/15 text-amber-300",
    };
    return `rounded px-2 py-1 text-xs font-semibold ${styles[status] || "bg-zinc-700/40 text-zinc-300"}`;
  };

  return (
    <section className="flex w-full flex-col gap-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
          Seller Dashboard
        </p>
        <h1 className="text-2xl font-semibold text-zinc-100 md:text-3xl">
          {data.shop.name}
        </h1>
        <p className="text-sm text-zinc-400">
          Shop status:{" "}
          <span className="font-semibold capitalize text-amber-300">
            {data.shop.status}
          </span>
        </p>
        {data.shop.status === "draft" && (
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/20 disabled:opacity-50"
          >
            {publishing ? "Publishing..." : "Publish Shop"}
          </button>
        )}
        {notice ? (
          <p role="status" className="text-sm text-emerald-300">
            {notice}
          </p>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-lg border border-red-700/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Total Revenue
          </p>
          <p className="mt-2 text-2xl font-bold text-zinc-100">
            {revenueFormatter.format(data.stats.totalRevenue / 100)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Total Orders
          </p>
          <p className="mt-2 text-2xl font-bold text-zinc-100">
            {data.stats.totalOrders}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Products
          </p>
          <p className="mt-2 text-2xl font-bold text-zinc-100">
            {data.stats.totalProducts}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Followers
          </p>
          <p className="mt-2 text-2xl font-bold text-zinc-100">
            {data.shop.followers}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-100">
            Shop Performance
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-400">Shop Views</dt>
              <dd className="font-semibold text-zinc-100">{data.shop.views}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">Average Rating</dt>
              <dd className="font-semibold text-zinc-100">
                {data.stats.avgRating.toFixed(1)}★
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">Reviews</dt>
              <dd className="font-semibold text-zinc-100">
                {data.stats.reviewCount}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-100">Pending</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-400">Payouts Ready</dt>
              <dd className="font-semibold text-amber-300">
                {data.stats.pendingPayouts}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">Full Analytics</dt>
              <dd className="text-zinc-500">Coming soon</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/60">
        <div className="border-b border-zinc-800/80 p-5">
          <h2 className="text-sm font-semibold text-zinc-100">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800/80 bg-zinc-900/40">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-400">
                  Date
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-400">
                  Buyer
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-400">
                  Item
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-400">
                  Amount
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {data.recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-900/30">
                  <td className="px-5 py-3 text-zinc-300">
                    {new Date(order.date).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-zinc-300">{order.buyer}</td>
                  <td className="px-5 py-3 text-zinc-300">{order.item}</td>
                  <td className="px-5 py-3 font-semibold text-zinc-100">
                    {revenueFormatter.format(order.amount / 100)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={statusBadge(order.status)}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-zinc-800/80 p-5 text-sm text-zinc-500">
          View all orders — coming soon
        </div>
      </div>
    </section>
  );
}
