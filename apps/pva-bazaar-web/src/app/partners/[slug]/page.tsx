"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getApiBase } from "@/lib/libraryApi";

interface PartnerProfile {
  businessName: string;
  slug: string;
  headline: string;
  summary: string;
  story: string;
  businessType: string;
  website: string;
  commodities: string[];
  services: string[];
  images: { logoUrl?: string; bannerUrl?: string };
  socialLinks: Record<string, string>;
  contact: { email?: string; phone?: string; location?: string; customMessage?: string };
  faq: { q: string; a: string }[];
  accentColor?: string;
};

export default function PartnerProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    const base = getApiBase();
    if (!base) {
      setError("API not configured.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${base}/api/partners/public/${encodeURIComponent(slug)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Partner not found");
        setPartner(data.partner);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Partner not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const accent = partner?.accentColor || "#d4af37";

  if (loading) return <p className="text-sm text-zinc-400">Loading page…</p>;
  if (!partner) {
    return (
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-8 text-center">
        <p className="text-sm text-zinc-400">{error || "Partner not found."}</p>
      </section>
    );
  }

  const socials = Object.entries(partner.socialLinks || {}).filter(([, v]) => v);

  return (
    <section className="flex w-full flex-col gap-6">
      {/* MySpace-style banner */}
      <div
        className="relative overflow-hidden rounded-xl border border-zinc-800/80"
        style={{
          background: `linear-gradient(135deg, ${accent}44, #0b0b0d 70%)`,
        }}
      >
        {partner.images?.bannerUrl ? (
          <img
            src={partner.images.bannerUrl}
            alt={`${partner.businessName} banner`}
            className="h-56 w-full object-cover"
          />
        ) : (
          <div className="h-40" />
        )}
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {partner.images?.logoUrl ? (
              <img
                src={partner.images.logoUrl}
                alt={`${partner.businessName} logo`}
                className="h-20 w-20 rounded-xl border border-zinc-700 bg-zinc-900 object-contain p-1"
              />
            ) : (
              <div
                className="flex h-20 w-20 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-2xl font-bold uppercase"
                style={{ color: accent }}
              >
                {partner.businessName.slice(0, 2)}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{partner.businessType || "Partner"}</p>
              <h1 className="text-2xl font-semibold text-zinc-100 md:text-3xl">{partner.businessName}</h1>
              {partner.headline ? <p className="mt-1 text-sm text-zinc-300">{partner.headline}</p> : null}
            </div>
          </div>
          {partner.website ? (
            <a
              href={partner.website}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/20"
            >
              Visit website →
            </a>
          ) : null}
        </div>
      </div>

      {partner.summary ? (
        <p className="text-sm leading-7 text-zinc-300">{partner.summary}</p>
      ) : null}

      {partner.story ? (
        <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">Our story</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">{partner.story}</p>
        </section>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {partner.commodities?.length ? (
          <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">Commodities</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {partner.commodities.map((item) => (
                <span key={item} className="rounded-full border border-zinc-700 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-300">
                  {item}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {partner.services?.length ? (
          <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">Services</h2>
            <ul className="mt-3 space-y-1 text-sm text-zinc-300">
              {partner.services.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {socials.length ? (
        <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">Connect</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {socials.map(([name, value]) => (
              <a
                key={name}
                href={/^https?:\/\//i.test(value) ? value : `https://${value}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-200 capitalize hover:border-amber-300/40"
              >
                {name}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">Work with them</h2>
        <div className="mt-3 space-y-2 text-sm text-zinc-300">
          {(partner.contact?.customMessage || partner.contact?.email) ? (
            <p>{partner.contact.customMessage || "Reach out directly to start a conversation."}</p>
          ) : (
            <p>Reach out directly to start a conversation.</p>
          )}
          <ul className="mt-2 space-y-1 text-sm">
            {partner.contact?.email ? (
              <li>
                Email:{" "}
                <a href={`mailto:${partner.contact.email}`} className="text-amber-300 hover:text-amber-200">
                  {partner.contact.email}
                </a>
              </li>
            ) : null}
            {partner.contact?.phone ? <li>Phone: {partner.contact.phone}</li> : null}
            {partner.contact?.location ? <li>Location: {partner.contact.location}</li> : null}
          </ul>
        </div>
      </section>

      {partner.faq?.length ? (
        <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">FAQ</h2>
          <div className="mt-3 space-y-2">
            {partner.faq.map((entry, i) => (
              <details key={i} className="rounded-lg border border-zinc-800 bg-black/30 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-zinc-100">{entry.q}</summary>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{entry.a}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}