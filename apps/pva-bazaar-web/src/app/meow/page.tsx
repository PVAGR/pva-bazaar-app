"use client";

import { useMemo, useState } from "react";

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

function resolveApiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_VERIFICATION_API_URL ||
    "";
  return raw.replace(/\/$/, "");
}

export default function MeowPage() {
  const apiBase = useMemo(() => resolveApiBase(), []);
  const [accountId, setAccountId] = useState("");
  const [transferAccountId, setTransferAccountId] = useState("");
  const [transferPayload, setTransferPayload] = useState(
    JSON.stringify(
      {
        contact_id: "replace_with_contact_id",
        amount: "10.00",
        network: "ethereum",
        currency: "USDC",
        memo: "PVA Bazaar live test",
      },
      null,
      2,
    ),
  );
  const [result, setResult] = useState<JsonValue>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function call(path: string, init?: RequestInit) {
    if (!apiBase) {
      setError("NEXT_PUBLIC_API_URL is not configured.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
      });
      const body = (await res.json()) as JsonValue;
      setResult(body);
      if (!res.ok) {
        setError(`Request failed (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function sendTransfer() {
    let payload: unknown;
    try {
      payload = JSON.parse(transferPayload);
    } catch {
      setError("Transfer payload must be valid JSON.");
      return;
    }
    await call("/api/meow/transfers/usdc", {
      method: "POST",
      body: JSON.stringify({
        accountId: transferAccountId || undefined,
        payload,
      }),
    });
  }

  return (
    <section className="w-full space-y-6">
      <header className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-emerald-300/80">Live Fintech Bridge</p>
        <h1 className="text-3xl font-semibold text-zinc-100">Meow Transaction Console</h1>
        <p className="max-w-3xl text-sm text-zinc-400">
          Public live testing surface for Meow API integration on PVA Bazaar. Use sandbox keys first. This page calls
          the backend routes under <code>/api/meow</code>.
        </p>
        <p className="text-xs text-zinc-500">
          API base: <code>{apiBase || "(not set)"}</code>
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm hover:border-emerald-500/60 hover:text-emerald-300"
          onClick={() => call("/api/meow/health")}
          disabled={loading}
        >
          Health
        </button>
        <button
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm hover:border-emerald-500/60 hover:text-emerald-300"
          onClick={() => call("/api/meow/accounts")}
          disabled={loading}
        >
          Accounts
        </button>
        <button
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm hover:border-emerald-500/60 hover:text-emerald-300"
          onClick={() =>
            call(`/api/meow/balances${accountId ? `?accountId=${encodeURIComponent(accountId)}` : ""}`)
          }
          disabled={loading}
        >
          Balances
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
        <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500">Account ID Override</label>
        <input
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          placeholder="Optional account ID for balances/transactions"
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/60"
        />
        <div className="mt-3">
          <button
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm hover:border-emerald-500/60 hover:text-emerald-300"
            onClick={() =>
              call(`/api/meow/transactions${accountId ? `?accountId=${encodeURIComponent(accountId)}` : ""}`)
            }
            disabled={loading}
          >
            Transactions
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
        <h2 className="mb-3 text-lg font-semibold text-zinc-200">USDC Transfer Test</h2>
        <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500">Transfer Account ID</label>
        <input
          value={transferAccountId}
          onChange={(e) => setTransferAccountId(e.target.value)}
          placeholder="Optional; uses MEOW_ACCOUNT_ID if empty"
          className="mb-3 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/60"
        />
        <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500">Transfer Payload JSON</label>
        <textarea
          value={transferPayload}
          onChange={(e) => setTransferPayload(e.target.value)}
          rows={10}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100 outline-none focus:border-emerald-500/60"
        />
        <button
          className="mt-3 rounded-lg border border-emerald-600/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300 hover:bg-emerald-900/40"
          onClick={sendTransfer}
          disabled={loading}
        >
          Send USDC Transfer
        </button>
      </div>

      {error ? (
        <div className="rounded border border-red-700/70 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>
      ) : null}

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
        <h2 className="mb-2 text-sm uppercase tracking-[0.2em] text-zinc-500">Response</h2>
        <pre className="max-h-[520px] overflow-auto rounded bg-black/40 p-3 text-xs text-zinc-200">
          {JSON.stringify(result, null, 2) || "No response yet."}
        </pre>
      </div>
    </section>
  );
}
