"use client";

import { useState } from "react";
import { getApiBase } from "@/lib/libraryApi";

export default function PartnerApplyPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    businessType: "",
    website: "",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
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
      const res = await fetch(`${base}/api/partners/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Application failed");
      setMsg(
        data.message ||
          "Application received — our team will review it and email you the link to your page if accepted.",
      );
    } catch (caught) {
      setErr(caught instanceof Error ? caught.message : "Application failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex w-full flex-col gap-8">
      <header className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Opt in</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-100 md:text-4xl">
          Apply to feature your business.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
          Fill this short form to opt in to the partners network. Once accepted you will receive an
          email with a private edit link — open it to build your own unique, MySpace-style page:
          your story, commodities, services, images, socials, FAQ and colors. No subscription, no
          fee, runs forever.
        </p>
      </header>

      {msg ? <p className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{msg}</p> : null}
      {err ? <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">{err}</p> : null}

      <form onSubmit={handleSubmit} className="grid gap-5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6 md:grid-cols-2">
        <label className="block text-sm text-zinc-300">
          Your name <span className="text-zinc-500">(owner / contact)</span>
          <input type="text" value={form.name} onChange={set("name")} required placeholder="e.g. Wanjiku Kamau"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500" />
        </label>
        <label className="block text-sm text-zinc-300">
          Contact email
          <input type="email" value={form.email} onChange={set("email")} required placeholder="business@example.com"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500" />
        </label>
        <label className="block text-sm text-zinc-300">
          Business / company name
          <input type="text" value={form.company} onChange={set("company")} required placeholder="e.g. Nakuru Crafts Co-op"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500" />
        </label>
        <label className="block text-sm text-zinc-300">
          Business type
          <select value={form.businessType} onChange={set("businessType")}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100">
            <option value="">Select…</option>
            <option value="craft cooperative">Craft cooperative</option>
            <option value="marketplace">Marketplace / website</option>
            <option value="workshop">Workshop / maker</option>
            <option value="gallery">Gallery</option>
            <option value="importer">Importer / distributor</option>
            <option value="service">Service provider</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="block text-sm text-zinc-300 md:col-span-2">
          Website
          <input type="url" value={form.website} onChange={set("website")} placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500" />
        </label>
        <label className="block text-sm text-zinc-300 md:col-span-2">
          Tell us about the business
          <textarea value={form.message} onChange={set("message")} rows={5} placeholder="What do you make or do? Who should know about you?"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500" />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-5 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/20 disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit application"}
          </button>
        </div>
      </form>

      <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-100">What happens next</h2>
        <ol className="mt-3 grid gap-2 text-sm leading-6 text-zinc-300">
          <li>1. Your application lands in the admin panel marked &quot;new&quot;.</li>
          <li>2. Our team reviews and approves or declines it.</li>
          <li>3. On approval, your page goes live and we email you your private edit link.</li>
          <li>4. Open the link any time to shape your page — it is yours, for free.</li>
        </ol>
      </section>
    </section>
  );
}