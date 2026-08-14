import type { Metadata } from "next";
import Link from "next/link";

const MAIN_APP_REGISTER_URL =
  process.env.NEXT_PUBLIC_MAIN_APP_REGISTER_URL || "https://pvabazaar.org/#/register";

export const metadata: Metadata = {
  title: "PVA Bazaar – Sacred Marketplace for Authentic Artifacts",
  description:
    "PVA Bazaar is a marketplace of Kenyan crafts with digital provenance. Browse the archive, verify artifacts, earn from referrals, or apply to feature your business.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "PVA Bazaar – Sacred Marketplace for Authentic Artifacts",
    description:
      "Kenyan crafts with digital provenance. Earn automatically from referrals. Businesses get their own page.",
    url: "/",
    type: "website",
  },
};

const DESTINATIONS = [
  {
    href: "/archive",
    title: "Archive",
    tag: "Browse & shop",
    description:
      "The living shelf of Kenyan crafts — beadwork and Kisii soapstone, each with a story and provenance signal.",
  },
  {
    href: "/verification",
    title: "Verification",
    tag: "Integrity",
    description:
      "How we check that an artifact is real and its history is intact. Trust as a ritual, not a claim.",
  },
  {
    href: "/referrals",
    title: "Referrals",
    tag: "Earn automatically",
    description:
      "Get a personal code emailed to you. Share your link — every sale through it pays you a 10% kickback automatically.",
  },
  {
    href: "/partners",
    title: "Partners",
    tag: "For businesses",
    description:
      "The businesses and websites we work with. Apply to be listed and get your own editable, MySpace-style page.",
  },
  {
    href: "/get-started",
    title: "Get Started",
    tag: "Orientation",
    description:
      "The full map of every tab and every role: seller, buyer, creator, collector, researcher, contributor.",
  },
  {
    href: "/manifesto",
    title: "Manifesto",
    tag: "Why it exists",
    description:
      "The Home Station Protocol — the values and anti-Druj operating stance behind the whole system.",
  },
  {
    href: "/library",
    title: "Library",
    tag: "Books",
    description:
      "Marketplace of published books, and a place to publish your own. Knowledge is an artifact too.",
  },
  {
    href: "/cart",
    title: "Cart",
    tag: "Checkout",
    description:
      "Claim an artifact. For Phase One, checkout runs through curated external marketplaces like Etsy.",
  },
];

export default function HomePage() {
  return (
    <section className="flex w-full flex-col gap-10">
      {/* Hero — what we do */}
      <header className="grid gap-6 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
            PVA Bazaar · Sacred Marketplace
          </p>
          <h1 className="text-3xl font-semibold text-zinc-100 md:text-4xl">
            Authentic artifacts, with proof in the story.
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-zinc-300">
            PVA Bazaar is a marketplace for hand-made Kenyan crafts — beadwork and Kisii
            soapstone — that pair each physical piece with digital provenance. We are the
            ritual layer: the place where stories, hashes, and verification live. Phase One
            ships Kenyan exports; the archive, verification, and referral systems run free and
            forever.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/archive"
              className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/20"
            >
              Browse the archive
            </Link>
            <Link
              href="/referrals"
              className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700/60"
            >
              Start earning referrals
            </Link>
            <Link
              href="/verification"
              className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700/60"
            >
              How verification works
            </Link>
          </div>
        </div>

        <aside className="space-y-4 rounded-xl border border-zinc-800/80 bg-black/40 p-4" aria-label="Quick paths">
          <h2 className="text-base font-semibold text-zinc-100">Which path are you on?</h2>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li>
              <Link href="/archive" className="block rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 hover:border-amber-300/40">
                <span className="font-medium text-zinc-100">I want to buy an artifact</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Go to the Archive → choose a piece → checkout via Etsy.
                </span>
              </Link>
            </li>
            <li>
              <Link href="/referrals" className="block rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 hover:border-amber-300/40">
                <span className="font-medium text-zinc-100">I want to earn by sharing</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Get your referral code emailed to you and earn 10% on every sale.
                </span>
              </Link>
            </li>
            <li>
              <Link href="/partners" className="block rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 hover:border-amber-300/40">
                <span className="font-medium text-zinc-100">I run a business / website</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Apply to be featured and get your own editable, MySpace-style page.
                </span>
              </Link>
            </li>
            <li>
              <a
                href={MAIN_APP_REGISTER_URL}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 hover:border-amber-300/40"
              >
                <span className="font-medium text-zinc-100">I want to create an account</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Account creation runs on the main federation app.
                </span>
              </a>
            </li>
          </ul>
        </aside>
      </header>

      {/* Where to go from the home page */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-zinc-100">Where to go</h2>
        <p className="text-sm text-zinc-400">
          One link for every main destination — choose based on what you came here to do.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {DESTINATIONS.map((route) => (
            <Link key={route.href} href={route.href}>
              <article className="group h-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5 transition-colors hover:border-amber-300/40 hover:bg-zinc-900/60">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{route.tag}</p>
                <h3 className="mt-1 text-base font-semibold text-zinc-100 group-hover:text-amber-200">
                  {route.title} →
                </h3>
                <p className="mt-2 text-sm text-zinc-300">{route.description}</p>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* What runs automatically */}
      <section className="rounded-xl border border-amber-300/60 bg-amber-300/5 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Always-on systems</p>
        <div className="mt-4 grid gap-4 text-sm text-zinc-300 md:grid-cols-3">
          <article>
            <h3 className="font-semibold text-zinc-100">Free referral economy</h3>
            <p className="mt-1">Codes are emailed to every person; no in-app memory limits. Sales, kickbacks and payout records all settle automatically.</p>
          </article>
          <article>
            <h3 className="font-semibold text-zinc-100">No subscriptions</h3>
            <p className="mt-1">Everything runs on free infrastructure — MongoDB, SMTP email, and the marketplace itself. It runs perennially as designed.</p>
          </article>
          <article>
            <h3 className="font-semibold text-zinc-100">Business pages that edit themselves</h3>
            <p className="mt-1">Approved partners get a private edit link by email and shape their own page like a MySpace profile — no developer needed.</p>
          </article>
        </div>
      </section>
    </section>
  );
}