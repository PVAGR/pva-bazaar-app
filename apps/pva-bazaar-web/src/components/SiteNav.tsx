"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getApiBase, getStoredAuth } from "@/lib/libraryApi";

export function SiteNav() {
  const [auth, setAuth] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored?.user) setAuth(stored.user);
  }, []);

  function signOut() {
    localStorage.removeItem("pva:book:auth");
    localStorage.removeItem("pvabazaar_recovery_token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("pvabazaar_recovery_api");
    setAuth(null);
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    const base = getApiBase();
    if (!base) {
      setError("API not configured.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const url = mode === "login" ? `${base}/api/auth/login` : `${base}/api/auth/register`;
      const body: Record<string, string> = { email, password };
      if (mode === "register") body.name = name;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || "Auth failed");
      if (!data?.token) throw new Error("No token returned");
      const user = data.user || { name, email };
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("pva:book:auth", JSON.stringify({ token: data.token, user }));
      setAuth(user);
      setShowAuth(false);
      setEmail("");
      setPassword("");
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="border-b border-zinc-800/80 bg-black/70 backdrop-blur">
      <nav aria-label="Primary" className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xs tracking-[0.3em] text-zinc-500 uppercase">PVA</span>
          <span className="text-sm font-semibold text-zinc-200">Bazaar</span>
        </Link>
        <div className="flex items-center gap-6 text-xs font-medium text-zinc-400">
          <Link href="/get-started" className="hover:text-amber-300">Get Started</Link>
          <Link href="/archive" className="hover:text-amber-300">Archive</Link>
          <Link href="/verification" className="hover:text-amber-300">Verification</Link>
          <Link href="/manifesto" className="hover:text-amber-300">Manifesto</Link>
          <Link href="/heelkawn" className="hover:text-amber-300">HeelKawn</Link>
          <Link href="/meow" className="hover:text-amber-300">Meow</Link>
          <Link href="/dashboard" className="hover:text-amber-300">Dashboard</Link>
          <Link href="/deals" className="hover:text-amber-300">Deals</Link>
          <Link href="/conference" className="hover:text-amber-300">Conference</Link>
          <Link href="/cart" className="hover:text-amber-300">Cart</Link>
          <Link href="/library" className="hover:text-amber-300">Library</Link>
          <Link href="/referrals" className="hover:text-amber-300">Referrals</Link>
          <Link href="/partners" className="hover:text-amber-300">Partners</Link>
          {auth ? (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5">
              {auth.role?.toLowerCase() === "admin" && (
                <span className="text-amber-400" title="Admin">&#9812;</span>
              )}
              <span className="text-zinc-200">
                {auth.name || auth.email || "Account"}
              </span>
              {auth.role?.toLowerCase() === "admin" && (
                <span className="rounded bg-amber-300/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                  Admin
                </span>
              )}
              <button
                type="button"
                onClick={signOut}
                className="ml-1 text-zinc-500 hover:text-zinc-300"
                title="Sign out"
              >
                &#10005;
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuth(!showAuth)}
              aria-expanded={showAuth}
              aria-controls="site-auth-panel"
              className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-3 py-1.5 text-amber-200 transition-colors hover:bg-amber-300/20"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>
      <div className="border-t border-zinc-800/80 bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            Phase One · Kenyan exports
          </p>
          <p className="text-[10px] text-zinc-500">
            This layer: stories, hashes, verification.
          </p>
        </div>
      </div>

      {showAuth && !auth && (
        <div
          id="site-auth-panel"
          className="border-t border-zinc-800/80 bg-zinc-950/90"
        >
          <form onSubmit={handleAuth} className="mx-auto flex max-w-5xl flex-wrap items-end gap-3 px-4 py-3">
            {mode === "register" && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                aria-label="Name"
                autoComplete="name"
                className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email or username"
              aria-label="Email or username"
              autoComplete="email"
              className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500"
            />
            <button
              type="submit"
              disabled={busy || !email || !password}
              className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-300/20 disabled:opacity-50"
            >
              {busy ? "..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
            <button
              type="button"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              {mode === "login" ? "Create account" : "Sign in instead"}
            </button>
            {error && (
              <p className="w-full text-xs text-red-400">{error}</p>
            )}
          </form>
        </div>
      )}
    </header>
  );
}
