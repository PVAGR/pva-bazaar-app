"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getApiBase } from "@/lib/libraryApi";

interface EditableProfile {
  businessName: string;
  headline: string;
  summary: string;
  story: string;
  website: string;
  businessType: string;
  commodities: string[];
  services: string[];
  images: { logoUrl?: string; bannerUrl?: string };
  socialLinks: Record<string, string>;
  contact: { email?: string; phone?: string; location?: string; customMessage?: string };
  faq: { q: string; a: string }[];
  accentColor?: string;
};

const EMPTY_PROFILE: EditableProfile = {
  businessName: "",
  headline: "",
  summary: "",
  story: "",
  website: "",
  businessType: "",
  commodities: [],
  services: [],
  images: { logoUrl: "", bannerUrl: "" },
  socialLinks: { instagram: "", tiktok: "", facebook: "", youtube: "", whatsapp: "", other: "" },
  contact: { email: "", phone: "", location: "", customMessage: "" },
  faq: [{ q: "", a: "" }],
};

function EditPageInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [profile, setProfile] = useState<EditableProfile>(EMPTY_PROFILE);
  const [pageUrl, setPageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing edit link. Open the link that was emailed to you.");
      setLoading(false);
      return;
    }
    const base = getApiBase();
    if (!base) {
      setError("API not configured.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${base}/api/partners/edit/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Edit link not found or revoked.");
        const p = data.partner;
        setProfile({
          businessName: p.businessName || "",
          headline: p.headline || "",
          summary: p.summary || "",
          story: p.story || "",
          website: p.website || "",
          businessType: p.businessType || "",
          commodities: Array.isArray(p.commodities) ? p.commodities : [],
          services: Array.isArray(p.services) ? p.services : [],
          images: { logoUrl: p.images?.logoUrl || "", bannerUrl: p.images?.bannerUrl || "" },
          socialLinks: {
            instagram: p.socialLinks?.instagram || "",
            tiktok: p.socialLinks?.tiktok || "",
            facebook: p.socialLinks?.facebook || "",
            youtube: p.socialLinks?.youtube || "",
            whatsapp: p.socialLinks?.whatsapp || "",
            other: p.socialLinks?.other || "",
          },
          contact: {
            email: p.contact?.email || "",
            phone: p.contact?.phone || "",
            location: p.contact?.location || "",
            customMessage: p.contact?.customMessage || "",
          },
          faq: Array.isArray(p.faq) && p.faq.length ? p.faq : [{ q: "", a: "" }],
          accentColor: p.accentColor || "#d4af37",
        });
        setPageUrl(data.pageUrl || "");
        window.history.replaceState(null, "", `/partners/edit?token=${encodeURIComponent(token)}`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Failed to load your page.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const update = useCallback((key: keyof EditableProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile((prev) => ({ ...prev, [key]: e.target.value }));
  }, []);

  const updateNested = useCallback((group: "images" | "socialLinks" | "contact", key: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setProfile((prev) => ({
        ...prev,
        [group]: { ...(prev[group]), [key]: e.target.value },
      }));
    }, []);

  const updateList = useCallback((key: "commodities" | "services") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setProfile((prev) => ({
      ...prev,
      [key]: raw.split(",").map((s) => s.trim()).filter(Boolean),
    }));
  }, []);

  const updateFaq = useCallback((index: number, field: "q" | "a") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setProfile((prev) => {
        const next = [...prev.faq];
        next[index] = { ...next[index], [field]: e.target.value };
        return { ...prev, faq: next };
      });
    }, []);

  async function handleSave() {
    if (!token) return;
    const base = getApiBase();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch(`${base}/api/partners/edit/${encodeURIComponent(token)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed");
      if (data.pageUrl) setPageUrl(data.pageUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const input = "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500";
  const label = "block text-sm text-zinc-300";

  if (loading) return <p className="text-sm text-zinc-400">Loading your page…</p>;

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Page editor</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-100 md:text-3xl">
          Shape your page — like a MySpace profile, but for your business.
        </h1>
        {pageUrl ? (
          <p className="mt-2 text-sm text-zinc-400">
            Live at{" "}
            <a href={pageUrl} target="_blank" rel="noreferrer" className="text-amber-300 hover:text-amber-200">
              {pageUrl}
            </a>
          </p>
        ) : null}
        {saved ? <p className="mt-2 text-sm text-emerald-300">Saved — your page is updated.</p> : null}
        {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
      </header>

      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="grid gap-5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6 md:grid-cols-2">
        <label className={`${label} md:col-span-2`}>
          Business name
          <input className={input} value={profile.businessName} onChange={update("businessName")} required />
        </label>
        <label className={label}>
          Headline
          <input className={input} value={profile.headline} onChange={update("headline")} placeholder="A short line that sells your story" />
        </label>
        <label className={label}>
          Business type
          <input className={input} value={profile.businessType} onChange={update("businessType")} placeholder="e.g. Craft cooperative" />
        </label>
        <label className={`${label} md:col-span-2`}>
          Summary
          <textarea className={input} rows={3} value={profile.summary} onChange={update("summary")} placeholder="One or two sentences shown in the directory." />
        </label>
        <label className={`${label} md:col-span-2`}>
          Story
          <textarea className={input} rows={6} value={profile.story} onChange={update("story")} placeholder="The full story — how you started, what you make, who should work with you." />
        </label>
        <label className={`${label} md:col-span-2`}>
          Website
          <input className={input} value={profile.website} onChange={update("website")} placeholder="https://…" type="url" />
        </label>
        <label className={label}>
          Commodities <span className="text-zinc-500">(comma-separated)</span>
          <input className={input} value={profile.commodities.join(", ")} onChange={updateList("commodities")} placeholder="Beadwork, Soapstone, Textiles" />
        </label>
        <label className={label}>
          Services <span className="text-zinc-500">(comma-separated)</span>
          <input className={input} value={profile.services.join(", ")} onChange={updateList("services")} placeholder="Custom orders, Wholesale, Workshops" />
        </label>
        <label className={label}>
          Logo image URL
          <input className={input} value={profile.images.logoUrl} onChange={updateNested("images", "logoUrl")} placeholder="https://…/logo.png" />
        </label>
        <label className={label}>
          Banner image URL
          <input className={input} value={profile.images.bannerUrl} onChange={updateNested("images", "bannerUrl")} placeholder="https://…/banner.jpg" />
        </label>

        <fieldset className="rounded-lg border border-zinc-800 bg-black/30 p-4 md:col-span-2">
          <legend className="px-2 text-xs uppercase tracking-[0.25em] text-zinc-500">Social links</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {Object.entries(profile.socialLinks).map(([key, value]) => (
              <label key={key} className={label}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
                <input className={input} value={value} onChange={updateNested("socialLinks", key)} placeholder="https://…" />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-zinc-800 bg-black/30 p-4 md:col-span-2">
          <legend className="px-2 text-xs uppercase tracking-[0.25em] text-zinc-500">Contact</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {Object.entries(profile.contact).map(([key, value]) => (
              <label key={key} className={label}>
                {key === "customMessage" ? "Message to visitors" : key.charAt(0).toUpperCase() + key.slice(1)}
                {key === "customMessage" ? (
                  <input className={input} value={value} onChange={updateNested("contact", key)} placeholder="e.g. Message us on WhatsApp to order." />
                ) : (
                  <input className={input} value={value} onChange={updateNested("contact", key)} />
                )}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-zinc-800 bg-black/30 p-4 md:col-span-2">
          <legend className="px-2 text-xs uppercase tracking-[0.25em] text-zinc-500">FAQ</legend>
          <div className="mt-2 space-y-3">
            {profile.faq.map((entry, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-2">
                <input className={input} value={entry.q} onChange={updateFaq(i, "q")} placeholder={`Question ${i + 1}`} />
                <input className={input} value={entry.a} onChange={updateFaq(i, "a")} placeholder="Answer" />
              </div>
            ))}
          </div>
        </fieldset>

        <label className={label}>
          Accent color
          <div className="mt-1 flex items-center gap-3">
            <input type="color" value={profile.accentColor} onChange={update("accentColor")} className="h-9 w-14 cursor-pointer rounded border border-zinc-700 bg-zinc-900" />
            <input className={input} value={profile.accentColor} onChange={update("accentColor")} placeholder="#d4af37" />
          </div>
        </label>

        <div className="flex items-end justify-end gap-3 md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-5 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/20 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function PartnerEditPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400">Loading editor…</p>}>
      <EditPageInner />
    </Suspense>
  );
}