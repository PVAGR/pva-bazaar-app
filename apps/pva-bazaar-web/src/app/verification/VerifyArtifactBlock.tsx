"use client";

import { useState } from "react";

const API_BASE = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_VERIFICATION_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "") : "";

export function VerifyArtifactBlock() {
  const [idOrSlug, setIdOrSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
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
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!idOrSlug.trim()) return;
    setError(null);
    setResult(null);
    if (!API_BASE) return;
    setLoading(true);
    try {
      const base = API_BASE.replace(/\/$/, "");
      const res = await fetch(`${base}/api/verification/artifact/${encodeURIComponent(idOrSlug.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
      <h2 className="mb-2 text-sm font-semibold text-zinc-100">
        Check verification for an artifact
      </h2>
      <p className="mb-4 text-xs text-zinc-400">
        Enter an artifact ID or slug to see the latest verification record (hash, status, certificate).
      </p>
      <form onSubmit={handleLookup} className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={idOrSlug}
          onChange={(e) => setIdOrSlug(e.target.value)}
          placeholder="e.g. artifact-id or slug"
          className="rounded-lg border border-zinc-600 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 min-w-[180px]"
          aria-label="Artifact ID or slug"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-300/20 disabled:opacity-50 transition-colors"
        >
          {loading ? "Looking up…" : "Look up"}
        </button>
      </form>
      {!API_BASE && (
        <p className="text-xs text-zinc-500 mb-2">
          Set <code className="text-zinc-400">NEXT_PUBLIC_VERIFICATION_API_URL</code> or{" "}
          <code className="text-zinc-400">NEXT_PUBLIC_API_URL</code> to enable live API lookup.
        </p>
      )}
      {error && (
        <div className="rounded-lg bg-red-950/40 border border-red-800/60 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      {result && !error && (
        <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-3 text-xs font-mono text-zinc-300 space-y-1">
          {result.verification ? (
            <>
              <p><span className="text-zinc-500">Certificate:</span> {result.verification.certificateId}</p>
              <p><span className="text-zinc-500">Status:</span> {result.verification.status}</p>
              <p><span className="text-zinc-500">Authentic:</span> {result.verification.is_authentic ? "Yes" : "No"}</p>
              <p><span className="text-zinc-500">Confidence:</span> {result.verification.confidence_score}</p>
              {result.verification.computed_hash && (
                <p><span className="text-zinc-500">Hash:</span> {result.verification.computed_hash}</p>
              )}
              {result.verification.verified_at && (
                <p><span className="text-zinc-500">Verified at:</span> {result.verification.verified_at}</p>
              )}
            </>
          ) : (
            <p className="text-zinc-500">{result.message ?? "No verification record for this artifact."}</p>
          )}
        </div>
      )}
    </article>
  );
}
