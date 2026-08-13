"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getApiBase } from "@/lib/libraryApi";

interface ReferralData {
  code: string;
  name: string;
  commissionRate: number;
  sales: number;
  totalCommissionsCents: number;
  pendingCents: number;
  joinedAt: string;
  status: string;
  recent?: {
    orderId: string;
    itemName: string;
    totalCents: number;
    commissionCents: number;
    currency: string;
    settledAt: string;
  }[];
};

interface EarningsResult {
  code: string;
  name: string;
  commissionRate: number;
  sales: number;
  totalCommissionsCents: number;
  pendingCents: number;
  joinedAt: string;
  status: string;
  recent: ReferralData["recent"];
}

export default function ReferralsPage() {
  const [siteBase, setSiteBase] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [issued, setIssued] = useState<{ code: string; referralUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [statsEmail, setStatsEmail] = useState("");
  const [statsBusy, setStatsBusy] = useState(false);
  const [statsErr, setStatsErr] = useState("");
  const [stats, setStats] = useState<EarningsResult | null>(null);

  useEffect(() => {
    setSiteBase(window.location.origin);
  }, []);

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    const base = getApiBase();
    if (!base) {
      setErr("API not configured — set NEXT_PUBLIC_API_URL.");
      return;
    }
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`${base}/api/referrals/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to issue referral code");
      setIssued({ code: data?.data?.code, referralUrl: data?.referralUrl });
      setMsg(data.message || "Referral code issued and emailed to you.");
    } catch (caught) {
      setErr(caught instanceof Error ? caught.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const referralLink = issued
    ? issued.referralUrl || `${siteBase}/?ref=${encodeURIComponent(issued.code)}`
    : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = referralLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  async function handleEarnings(e: React.FormEvent) {
    e.preventDefault();
    const base = getApiBase();
    if (!base) {
      setStatsErr("API not configured.");
      return;
    }
    setStatsBusy(true);
    setStatsErr("");
    try {
      const res = await fetch(`${base}/api/referrals/earnings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: statsEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "No records found");
      setStats(data.data);
    } catch (caught) {
      setStats(null);
      setStatsErr(caught instanceof Error ? caught.message : "Failed");
    } finally {
      setStatsBusy(false);
    }
  }

  const cents = (value: number) => (Number(value || 0) / 100).toFixed(2);

  return (
    <section className="flex w-full flex-col gap-8">
      <header className="grid gap-6 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Referral program</p>
          <h1 className="text-3xl font-semibold text-zinc-100 md:text-4xl">
            Earn 10% of every sale you drive.
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-zinc-300">
            Get a personal referral code emailed to you — no account needed, unlimited people
            served. Share your link anywhere. When someone buys an artifact through it, your
            kickback is calculated from the sale price and recorded automatically. Payouts queue
            for settlement and you are emailed each time a sale lands. Free, forever.
          </p>
          <ol className="grid gap-2 text-sm leading-6 text-zinc-300">
            <li>1. Enter your name and email below — your code is emailed to you instantly.</li>
            <li>2. Share your personal link on email, social, WhatsApp — anywhere.</li>
            <li>3. Someone clicks and purchases. Your commission is credited automatically.</li>
            <li>4. Check earnings any time with the same email.</li>
          </ol>
        </div>
        <aside className="space-y-3 rounded-xl border border-zinc-800/80 bg-black/40 p-4" aria-label="Commission rates">
          <h2 className="text-base font-semibold text-zinc-100">Commission rates</h2>
          <div className="space-y-2 text-sm text-zinc-300">
            <p className="rounded-lg border border-amber-300/40 bg-amber-300/5 p-3">
              <strong className="text-amber-200">10%</strong> — artifacts &amp; marketplace items
            </p>
            <p className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
              <strong>15%</strong> — published books in the library
            </p>
            <p className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
              <strong>20%</strong> — memberships &amp; upgrades (when available)
            </p>
          </div>
        </aside>
      </header>

      {msg ? <p className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{msg}</p> : null}
      {err ? <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">{err}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Issue a code */}
        <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Step 1 · Your code</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-100">Get your referral code</h2>
          <p className="mt-1 text-sm text-zinc-400">
            We email the code to you so it is never lost — memory lives in your inbox and our
            records, not in the browser.
          </p>
          <form onSubmit={handleIssue} className="mt-4 space-y-3">
            <label className="block text-sm text-zinc-300">
              Your name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ada Onyango"
                required
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
              />
            </label>
            <label className="block text-sm text-zinc-300">
              Your email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !email || !name}
              className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/20 disabled:opacity-50"
            >
              {busy ? "Working…" : "Email me my code"}
            </button>
          </form>

          {issued ? (
            <div className="mt-5 rounded-lg border border-amber-300/40 bg-black/40 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Your code</p>
              <p className="mt-1 text-3xl font-bold tracking-[0.3em] text-zinc-100">{issued.code}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  aria-label="Your referral link"
                  className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-300"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-300/20"
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        {/* Check earnings */}
        <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Step 2 · Your records</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-100">Check your earnings</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Enter the email attached to your code to see sales, pending kickbacks and lifetime totals.
          </p>
          <form onSubmit={handleEarnings} className="mt-4 space-y-3">
            <label className="block text-sm text-zinc-300">
              Your email
              <input
                type="email"
                value={statsEmail}
                onChange={(e) => setStatsEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
              />
            </label>
            <button
              type="submit"
              disabled={statsBusy || !statsEmail}
              className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700/60 disabled:opacity-50"
            >
              {statsBusy ? "Checking…" : "Check earnings"}
            </button>
          </form>

          {statsErr ? <p className="mt-3 text-sm text-red-300">{statsErr}</p> : null}

          {stats ? (
            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-zinc-800 bg-black/40 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Code</p>
                  <p className="truncate text-sm font-semibold text-zinc-100">{stats.code}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black/40 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Sales</p>
                  <p className="text-sm font-semibold text-zinc-100">{stats.sales}</p>
                </div>
                <div className="rounded-lg border border-amber-300/40 bg-amber-300/5 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-amber-300">Pending</p>
                  <p className="text-sm font-semibold text-amber-100">${cents(stats.pendingCents)}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black/40 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Lifetime</p>
                  <p className="text-sm font-semibold text-zinc-100">${cents(stats.totalCommissionsCents)}</p>
                </div>
              </div>
              {stats.recent && stats.recent.length > 0 ? (
                <ul className="space-y-1 text-xs text-zinc-400">
                  {stats.recent.map((entry, i) => (
                    <li key={`${entry.orderId}-${i}`} className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-2">
                      {entry.itemName} · ${cents(entry.totalCents)} sale →{" "}
                      <strong className="text-amber-200">${cents(entry.commissionCents)}</strong> for you
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-100">How the payout works</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
          <li>Every paid order attributed to your code creates a payout record automatically.</li>
          <li>Your pending balance is visible here any time with your email.</li>
          <li>Refunds reverse the commission so nothing is ever double-counted.</li>
          <li>When a sale lands you are emailed the amount earned — no account, no subscription.</li>
        </ul>
        <p className="mt-4 text-sm text-zinc-400">
          Want to feature your business instead?{" "}
          <Link href="/partners" className="text-amber-300 hover:text-amber-200">
            Browse and apply at the partners directory →
          </Link>
        </p>
      </section>
    </section>
  );
}