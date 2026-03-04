import Link from "next/link";

export default function Home() {
  return (
    <section className="flex flex-col gap-14">
      <header className="space-y-6 text-center md:text-left">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
          Alchemical Digital · Sanctuary
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold text-zinc-100 leading-tight">
          Preserve scarce knowledge.
          <br />
          <span className="text-amber-300/90">Verify integrity. Acquire as a Conscious Player.</span>
        </h1>
        <p className="max-w-xl text-sm text-zinc-400">
          PVA Bazaar is a ritual layer for artifacts: stories, hashes, and provenance.
          We treat each object as evidence that a human hand was here.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/archive"
            className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-300/20 transition-colors"
          >
            Enter the Archive
          </Link>
          <Link
            href="/verification"
            className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/60 transition-colors"
          >
            How verification works
          </Link>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
          <h2 className="mb-2 text-sm font-semibold text-zinc-100">
            Phase One · Kenyan crafts
          </h2>
          <p className="text-sm text-zinc-300">
            Beadwork and Kisii soapstone: Maasai signal circuits, memory bowls, totems.
            Each piece ships small and carries a long story. Checkout runs via Etsy
            while we build the in-house cart and verification dashboard.
          </p>
          <Link href="/archive" className="mt-3 inline-block text-xs font-medium text-amber-300 hover:text-amber-200">
            View archive →
          </Link>
        </article>

        <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
          <h2 className="mb-2 text-sm font-semibold text-zinc-100">
            Anti-Druj
          </h2>
          <p className="text-sm text-zinc-300">
            We aim to be auditable and kind to future readers. No cinematic
            upgrades, no definitive edition, no DRM scarring. Hashes and
            provenance stay on the record so you can verify what you hold.
          </p>
          <Link href="/verification" className="mt-3 inline-block text-xs font-medium text-amber-300 hover:text-amber-200">
            Verification →
          </Link>
        </article>
      </div>

      <p className="text-[11px] text-zinc-500 max-w-xl">
        All systems here are built to preserve history and support Conscious Players.
        The manifesto and cart live in the nav when you are ready.
      </p>
    </section>
  );
}
