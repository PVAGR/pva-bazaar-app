'use client';

import { useMemo, useState } from 'react';

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_VERIFICATION_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '')
    : '';

interface DealItem {
  _id: string;
  title: string;
  status?: string;
  totalAmount?: number;
  currency?: string;
  escrow?: {
    status?: string;
    fundingMode?: string;
  };
  dispute?: {
    status?: string;
  };
}

function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
  };
}

export default function DealsPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DealItem[]>([]);
  const [selected, setSelected] = useState<DealItem | null>(null);
  const [shareLink, setShareLink] = useState('');

  const [createTitle, setCreateTitle] = useState('Natural Pink Sapphire · Peshawar');
  const [createAmount, setCreateAmount] = useState('300');
  const [createCurrency, setCreateCurrency] = useState('USD');

  const [disputeReason, setDisputeReason] = useState('Item not as described');

  const hasApiBase = Boolean(API_BASE);
  const base = useMemo(() => API_BASE.replace(/\/$/, ''), []);

  async function loadDeals() {
    if (!token.trim() || !hasApiBase) return;
    setLoading(true);
    setError(null);
    try {
      const res = await globalThis.fetch(`${base}/api/deals?limit=50`, {
        headers: authHeaders(token.trim()),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Failed to load deals');
      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list);
      if (selected?._id) {
        const next = list.find((d: DealItem) => d._id === selected._id) || null;
        setSelected(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  async function createDeal() {
    if (!token.trim() || !hasApiBase) return;
    setLoading(true);
    setError(null);
    try {
      const res = await globalThis.fetch(`${base}/api/deals`, {
        method: 'POST',
        headers: authHeaders(token.trim()),
        body: JSON.stringify({
          title: createTitle,
          totalAmount: Number(createAmount || 0),
          currency: createCurrency,
          milestones: [
            {
              title: 'Tracking number provided',
              evidenceType: 'tracking_number',
              status: 'pending',
            },
            { title: 'Delivery confirmed', evidenceType: 'message', status: 'pending' },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.item)
        throw new Error(data?.error || 'Failed to create deal');
      await loadDeals();
      setSelected(data.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  async function doAction(path: string, body: Record<string, unknown> = {}) {
    if (!selected?._id || !token.trim() || !hasApiBase) return;
    setLoading(true);
    setError(null);
    try {
      const res = await globalThis.fetch(`${base}/api/deals/${selected._id}${path}`, {
        method: 'POST',
        headers: authHeaders(token.trim()),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.item) throw new Error(data?.error || 'Action failed');
      setSelected(data.item);
      await loadDeals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  async function makeInvite() {
    if (!selected?._id || !token.trim() || !hasApiBase) return;
    setLoading(true);
    setError(null);
    try {
      const res = await globalThis.fetch(`${base}/api/deals/${selected._id}/invite`, {
        method: 'POST',
        headers: authHeaders(token.trim()),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.joinUrl)
        throw new Error(data?.error || 'Failed to create invite');
      setShareLink(data.joinUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex w-full flex-col gap-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Secure Deals</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100">Escrow command deck</h1>
        <p className="max-w-3xl text-sm text-zinc-400">
          Real API control for secure deals with login-only actions, mock transfer confirmations,
          escrow release/refund, dispute workflow, and fraud packet generation.
        </p>
      </header>

      <div className="rounded-lg border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-3">
        <label className="block text-xs font-medium text-zinc-300">
          JWT token (required for all actions)
        </label>
        <input
          className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs text-zinc-100"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste Bearer token"
        />
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-xs text-amber-200"
            onClick={loadDeals}
            disabled={loading || !hasApiBase}
          >
            {loading ? 'Working...' : 'Load deals'}
          </button>
          <button
            className="rounded-lg border border-zinc-600 bg-zinc-800/70 px-3 py-2 text-xs text-zinc-200"
            onClick={createDeal}
            disabled={loading || !hasApiBase}
          >
            Create deal
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200">Create secure deal</h2>
          <input
            className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              value={createAmount}
              onChange={(e) => setCreateAmount(e.target.value)}
            />
            <input
              className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              value={createCurrency}
              onChange={(e) => setCreateCurrency(e.target.value)}
            />
          </div>
          <p className="text-xs text-zinc-500">
            Created deals are ready for invite links and escrow controls below.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200">Deals</h2>
          <div className="max-h-72 overflow-auto space-y-2">
            {items.map((item) => (
              <button
                key={item._id}
                onClick={() => setSelected(item)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${selected?._id === item._id ? 'border-amber-400/80 bg-amber-400/10' : 'border-zinc-700 bg-zinc-800/60'}`}
              >
                <div className="font-semibold text-zinc-100">{item.title}</div>
                <div className="text-zinc-400">
                  {item.currency || 'USD'} {item.totalAmount || 0} · escrow{' '}
                  {item.escrow?.status || 'draft'} · dispute {item.dispute?.status || 'none'}
                </div>
              </button>
            ))}
            {items.length === 0 ? (
              <p className="text-xs text-zinc-500">No deals loaded yet.</p>
            ) : null}
          </div>
        </div>
      </div>

      {selected ? (
        <div className="rounded-lg border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100">Selected: {selected.title}</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              className="rounded border border-zinc-600 px-3 py-2"
              onClick={makeInvite}
              disabled={loading}
            >
              Generate join link
            </button>
            <button
              className="rounded border border-zinc-600 px-3 py-2"
              onClick={() =>
                doAction('/escrow/mock-fund', {
                  amount: selected.totalAmount || 0,
                  currency: selected.currency || 'USD',
                  proofNote: 'Mock transfer confirmed by screenshot',
                })
              }
              disabled={loading}
            >
              Mock fund
            </button>
            <button
              className="rounded border border-zinc-600 px-3 py-2"
              onClick={() => doAction('/escrow/confirm-receipt')}
              disabled={loading}
            >
              Confirm receipt
            </button>
            <button
              className="rounded border border-zinc-600 px-3 py-2"
              onClick={() => doAction('/escrow/release')}
              disabled={loading}
            >
              Release
            </button>
            <button
              className="rounded border border-zinc-600 px-3 py-2"
              onClick={() => doAction('/escrow/refund')}
              disabled={loading}
            >
              Refund
            </button>
            <button
              className="rounded border border-zinc-600 px-3 py-2"
              onClick={() => doAction('/dispute', { reason: disputeReason })}
              disabled={loading}
            >
              Open dispute
            </button>
            <button
              className="rounded border border-zinc-600 px-3 py-2"
              onClick={async () => {
                if (!selected?._id || !token.trim()) return;
                setLoading(true);
                setError(null);
                try {
                  const res = await globalThis.fetch(
                    `${base}/api/deals/${selected._id}/reports/fraud-packet`,
                    {
                      method: 'POST',
                      headers: authHeaders(token.trim()),
                      body: JSON.stringify({
                        outbound: {
                          sendRequested: true,
                          approvedByAdmin: false,
                          targets: ['FTC', 'FIA Pakistan', 'FBI IC3', 'PGMA Compliance Desk'],
                        },
                      }),
                    },
                  );
                  const data = await res.json();
                  if (!res.ok || !data?.ok)
                    throw new Error(data?.error || 'Failed to generate packet');
                  await loadDeals();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Network error');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              Generate fraud packet
            </button>
          </div>
          <input
            className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Dispute reason"
          />
          {shareLink ? <p className="text-xs text-amber-300 break-all">{shareLink}</p> : null}
        </div>
      ) : null}

      {!hasApiBase && (
        <p className="text-xs text-zinc-500">
          Deals are not connected. Set NEXT_PUBLIC_API_URL or NEXT_PUBLIC_VERIFICATION_API_URL.
        </p>
      )}

      {error ? (
        <div className="rounded-lg border border-red-700/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}
    </section>
  );
}
