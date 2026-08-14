"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getApiBase } from "@/lib/libraryApi";

interface PartnerLite {
  businessName: string;
  slug: string;
  headline: string;
  summary: string;
  businessType: string;
  website: string;
  images: { logoUrl?: string; bannerUrl?: string };
  accentColor?: string;
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<PartnerLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const base = getApiBase();
    if (!base) {
      setError("API not configured — set NEXT_PUBLIC_API_URL.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${base}/api/partners/public`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load partners");
        setPartners(data.partners || []);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Failed to load partners");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="flex w-full flex-col gap-8">
      <header className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Partners directory</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-100 md:text-4xl">
          The businesses we work with.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
          Every business or website on this page has opted in to our network. Each partner owns an
          editable page shaped like a MySpace profile — their story, commodities, services, socials,
          and contact — updated by them directly through a private link.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/partners/apply"
            className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/20"
          >
            Apply to be featured
          </Link>
          <Link
            href="/referrals"
            className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700/60"
          >
            Or earn via referrals
          </Link>
        </div>
      </header>

      {error ? <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-zinc-400">Loading partners…</p>
      ) : partners.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-8 text-center">
          <p className="text-sm text-zinc-400">
            No partners yet — be the first to{" "}
            <Link href="/partners/apply" className="text-amber-300 hover:text-amber-200">
              apply for a page
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {partners.map((partner) => (
            <Link key={partner.slug} href={`/partners/${partner.slug}`}>
              <article
                className="group h-full overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/60 transition-colors hover:border-amber-300/40"
                style={{ boxShadow: partner.accentColor ? `inset 0 0 0 3px ${partner.accentColor}22` : undefined }}
              >
                <div
                  className="flex h-24 items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${partner.accentColor || "#27272a"}33, transparent)` }}
                >
                  {partner.images?.logoUrl ? (
                    <img
                      src={partner.images.logoUrl}
                      alt={`${partner.businessName} logo`}
                      className="max-h-16 max-w-[70%] object-contain"
                    />
                  ) : (
                    <span className="text-2xl font-semibold uppercase tracking-widest text-zinc-600">
                      {partner.businessName.slice(0, 2)}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                    {partner.businessType || "Partner"}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-zinc-100 group-hover:text-amber-200">
                    {partner.businessName} →
                  </h2>
                  <p className="mt-2 text-sm text-zinc-300">{partner.headline || partner.summary}</p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}

      <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-100">What partners get</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-300 md:grid-cols-2">
          <li>Their own live page at a permanent link — a MySpace-style home for the business.</li>
          <li>A private edit link, sent by email, to shape the page themselves.</li>
          <li>Story, commodities, services, images, socials, FAQ and colors — fully customizable.</li>
          <li>Listing in the directory that every visitor sees, no subscription or fee.</li>
          <li>Optional referral code on top, so their page can also send you customers.</li>
        </ul>
      </section>
    </section>
  );
}