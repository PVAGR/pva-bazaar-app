import type { Metadata } from "next";
import Link from "next/link";

const MAIN_APP_REGISTER_URL = process.env.NEXT_PUBLIC_MAIN_APP_REGISTER_URL || "https://pvabazaar.org/#/register";

const START_ROUTES = [
  {
    href: "/archive",
    title: "Archive",
    description: "Read preserved entries and navigate the living knowledge record.",
  },
  {
    href: "/verification",
    title: "Verification",
    description: "Understand how artifact trust and integrity checks are performed.",
  },
  {
    href: "/manifesto",
    title: "Manifesto",
    description: "See the federation values and anti-Druj operating stance.",
  },
  {
    href: "/heelkawn",
    title: "HeelKawn",
    description: "Access the dedicated game page and download package for phone testing.",
  },
  {
    href: "/dashboard",
    title: "Dashboard",
    description: "Track member activity, profile signals, and operational updates.",
  },
  {
    href: "/deals",
    title: "Deals",
    description: "Explore community-aligned deals and cooperative execution channels.",
  },
  {
    href: "/conference",
    title: "Conference",
    description: "See active conference context and shared focus across contributors.",
  },
];

const PATH_OPTIONS = [
  {
    title: "Seller",
    summary: "Publish authentic inventory and connect your provenance story to buyers.",
  },
  {
    title: "Consumer",
    summary: "Collect verified artifacts and follow creators across archive and marketplace layers.",
  },
  {
    title: "Creator/Artist",
    summary: "Document your journey, publish context-rich work, and build an accountable presence.",
  },
  {
    title: "Collector",
    summary: "Curate, verify, and preserve rare pieces with transparent acquisition records.",
  },
  {
    title: "Researcher",
    summary: "Trace evidence, compare claims, and connect archive entries to verifiable signals.",
  },
  {
    title: "Federation Contributor",
    summary: "Support governance and community operations with practical contribution pathways.",
  },
  {
    title: "Other",
    summary: "Bring your own path and map it to federation tools during onboarding.",
  },
];

export const metadata: Metadata = {
  title: "Get Started – PVA Bazaar",
  description: "First-stop onboarding map for the PVA federation experience.",
};

export default function GetStartedPage() {
  const coreRoutes = START_ROUTES.slice(0, 3);
  const journeyRoutes = START_ROUTES.slice(3);

  return (
    <section className="flex w-full flex-col gap-10">
      <header className="grid gap-6 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Federation Entry</p>
        <h1 className="text-3xl font-semibold text-zinc-100 md:text-4xl">
          Start here: what every tab does and where your path begins
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-zinc-300">
          This page is now the first impression for the sanctuary layer. Learn each tab quickly, choose your federation
          path, and continue to account setup and identity steps.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/archive"
            className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/20"
          >
            Explore archive
          </Link>
          <Link
            href="/manifesto"
            className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700/60"
          >
            Read manifesto
          </Link>
        </div>
        </div>

        <aside className="space-y-3 rounded-xl border border-zinc-800/80 bg-black/40 p-4" aria-label="Account entry">
          <h2 className="text-base font-semibold text-zinc-100">Create your account</h2>
          <p className="text-sm leading-6 text-zinc-300">
            Account creation currently runs on the main federation app. After joining, continue into role setup,
            wallet connection or generation, and optional DID/IPFS onboarding.
          </p>
          <a
            href={MAIN_APP_REGISTER_URL}
            className="inline-flex rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/20"
            target="_blank"
            rel="noreferrer"
          >
            Open registration
          </a>
          <p className="text-xs text-zinc-500">Set NEXT_PUBLIC_MAIN_APP_REGISTER_URL to override this destination.</p>
        </aside>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-zinc-100">Core tabs</h2>
        <p className="text-sm text-zinc-400">Primary surfaces for archive, verification, and guiding context.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {coreRoutes.map((route) => (
          <article key={route.href} className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
            <h2 className="text-base font-semibold text-zinc-100">{route.title}</h2>
            <p className="mt-2 text-sm text-zinc-300">{route.description}</p>
            <Link href={route.href} className="mt-3 inline-block text-xs font-medium text-amber-300 hover:text-amber-200">
              Open {route.title}
            </Link>
          </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-zinc-100">Journey tabs</h2>
        <p className="text-sm text-zinc-400">Use these as your operational layer once your profile path is defined.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {journeyRoutes.map((route) => (
            <article key={route.href} className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
              <h3 className="text-base font-semibold text-zinc-100">{route.title}</h3>
              <p className="mt-2 text-sm text-zinc-300">{route.description}</p>
              <Link href={route.href} className="mt-3 inline-block text-xs font-medium text-amber-300 hover:text-amber-200">
                Open {route.title}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-zinc-100">Choose your federation path</h2>
        <p className="text-sm text-zinc-400">These are the role tracks that your onboarding flow will support.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {PATH_OPTIONS.map((option) => (
            <article key={option.title} className="rounded-xl border border-zinc-800/80 bg-black/30 p-4">
              <h3 className="text-sm font-semibold text-zinc-100">{option.title}</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-300">{option.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-100">Next identity layer</h2>
        <ol className="mt-3 grid gap-2 text-sm text-zinc-300">
          <li>1. Create your account and pick your role path.</li>
          <li>2. Connect an existing wallet or generate a new wallet.</li>
          <li>3. Optionally create a DID and add an IPFS profile artifact.</li>
          <li>4. Continue into community feed and messaging layers.</li>
        </ol>
      </section>
    </section>
  );
}
