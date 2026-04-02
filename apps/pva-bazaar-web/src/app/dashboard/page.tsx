"use client";

import Link from "next/link";
import { useState } from "react";

const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_VERIFICATION_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "")
    : "";

type VerificationResult = {
  verification: {
    certificateId: string;
    is_authentic: boolean;
    confidence_score: number;
    status: string;
    message: string | null;
    verified_at: string;
    computed_hash: string | null;
  } | null;
  message?: string;
};

export default function DashboardPage() {
  const [idsInput, setIdsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ id: string; data: VerificationResult }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const hasApiBase = Boolean(API_BASE);

  function parseIds(raw: string): string[] {
    return raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const ids = parseIds(idsInput);
    if (ids.length === 0) return;
    setError(null);
    setResults([]);
    if (!hasApiBase) {
      setError("Verification service is not configured for this site yet.");
      return;
    }
    setLoading(true);
    const base = API_BASE.replace(/\/$/, "");
    try {
      const list = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`${base}/api/verification/artifact/${encodeURIComponent(id)}`);
          const data = await res.json();
          return { id, data };
        })
      );
      setResults(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Dashboard</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100">
          My artifacts
        </h1>
        <p className="max-w-xl text-sm text-zinc-400">
          Enter one or more artifact IDs (one per line or comma-separated) to see
          verification status for each. No sign-in for this MVP; you provide the
          IDs you care about.
        </p>
      </header>

      <form onSubmit={handleLookup} className="space-y-4">
        <label className="block text-xs font-medium text-zinc-400">
          Artifact IDs
        </label>
        <textarea
          value={idsInput}
          onChange={(e) => setIdsInput(e.target.value)}
          placeholder={"e.g. artifact-1\nartifact-2"}
          rows={4}
          className="w-full max-w-xl rounded-lg border border-zinc-600 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 font-mono"
          aria-label="Artifact IDs, one per line or comma-separated"
        />
        <button
          type="submit"
          disabled={loading || !hasApiBase}
          className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-300/20 disabled:opacity-50 transition-colors"
        >
          {loading ? "Looking up…" : "Look up verification"}
        </button>
      </form>

      {!hasApiBase && (
        <p className="text-xs text-zinc-500">
          Verification lookup is not connected yet. Site operator: set{" "}
          <code className="text-zinc-400">NEXT_PUBLIC_VERIFICATION_API_URL</code> or{" "}
          <code className="text-zinc-400">NEXT_PUBLIC_API_URL</code> to enable lookups.
        </p>
      )}

      {error && (
        <div className="rounded-lg bg-red-950/40 border border-red-800/60 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100">Results</h2>
          <ul className="space-y-2">
            {results.map(({ id, data }) => (
              <li
                key={id}
                className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-3 text-xs font-mono text-zinc-300"
              >
                <span className="text-zinc-500">{id}</span>
                {data.verification ? (
                  <>
                    <span className="mx-2">·</span>
                    <span>Status: {data.verification.status}</span>
                    <span className="mx-2">·</span>
                    <span>Cert: {data.verification.certificateId}</span>
                    {data.verification.computed_hash && (
                      <>
                        <span className="mx-2">·</span>
                        <span className="text-zinc-500 truncate block mt-1">
                          Hash: {data.verification.computed_hash}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="ml-2 text-zinc-500">
                    {data.message ?? "No verification record"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/verification"
          className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/60 transition-colors"
        >
          Verification
        </Link>
        <Link
          href="/archive"
          className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/60 transition-colors"
        >
          Archive
        </Link>
        <Link
          href="/deals"
          className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/60 transition-colors"
        >
          Deals
        </Link>
      </div>
    </section>
  );
}
