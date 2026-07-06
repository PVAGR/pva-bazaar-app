'use client';

import { useEffect, useMemo, useState } from 'react';

interface Proposal {
  _id: string;
  title: string;
  summary: string;
  status: string;
  supportCount?: number;
  updatedAt?: string;
}

interface VoteSummary {
  voteCounts?: {
    yes?: number;
    no?: number;
    abstain?: number;
  };
  totalVotes?: number;
}

function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_VERIFICATION_API_URL || '';

  if (!raw) return '';
  const clean = raw.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}

export default function ConferencePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [summary, setSummary] = useState<VoteSummary | null>(null);

  const apiBase = useMemo(() => getApiBase(), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      if (!apiBase) {
        setError(
          'Set NEXT_PUBLIC_API_URL (or NEXT_PUBLIC_VERIFICATION_API_URL) to load conference data.',
        );
        setLoading(false);
        return;
      }

      try {
        const response = await globalThis.fetch(`${apiBase}/governance/proposals?limit=30`, {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || data?.message || 'Failed to load proposals');
        }

        if (cancelled) return;
        const items = Array.isArray(data.items) ? data.items : [];
        setProposals(items);
        setSelectedId(items[0]?._id || '');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load proposals');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      if (!apiBase || !selectedId) {
        setSummary(null);
        return;
      }
      try {
        const response = await globalThis.fetch(
          `${apiBase}/governance/proposals/${selectedId}/votes/summary`,
          {
            cache: 'no-store',
          },
        );
        const data = await response.json();
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || data?.message || 'Failed to load vote summary');
        }
        if (!cancelled) setSummary(data);
      } catch {
        if (!cancelled) setSummary(null);
      }
    }

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [apiBase, selectedId]);

  const selected = proposals.find((item) => item._id === selectedId) || null;

  return (
    <section className="w-full space-y-6">
      <header className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          Direct Democracy Layer
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-100">Popular Conference</h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-400">
          Public read model for proposals and vote totals. Proposal creation, wallet verification,
          and vote submission happen in the main app while this sanctuary layer mirrors live
          governance state.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">
            Proposal Board
          </h2>
          {loading ? <p className="mt-3 text-sm text-zinc-500">Loading proposals…</p> : null}
          {!loading && proposals.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No proposals are available yet.</p>
          ) : null}
          <div className="mt-3 grid gap-3">
            {proposals.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => setSelectedId(item._id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selectedId === item._id
                    ? 'border-amber-300/70 bg-amber-300/10'
                    : 'border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-600'
                }`}
              >
                <h3 className="text-sm font-semibold text-zinc-100">{item.title}</h3>
                <p className="mt-1 text-xs text-zinc-400">{item.summary}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5">
                    status: {item.status}
                  </span>
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5">
                    support: {item.supportCount || 0}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">
            Live Vote Totals
          </h2>
          {!selected ? (
            <p className="mt-3 text-sm text-zinc-500">Choose a proposal to inspect votes.</p>
          ) : null}
          {selected ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm font-semibold text-zinc-100">{selected.title}</p>
              <div className="grid gap-2 text-sm text-zinc-300">
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2">
                  YES: {summary?.voteCounts?.yes || 0}
                </div>
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2">
                  NO: {summary?.voteCounts?.no || 0}
                </div>
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2">
                  ABSTAIN: {summary?.voteCounts?.abstain || 0}
                </div>
                <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-amber-100">
                  TOTAL: {summary?.totalVotes || 0}
                </div>
              </div>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
