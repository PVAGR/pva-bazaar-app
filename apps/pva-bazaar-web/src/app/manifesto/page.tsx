import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Manifesto – PVA Bazaar',
  description:
    'Home Station Protocol. Pasha VII – Moon 3 – Royal Amarr Institute School. Initiate acquisition; preserve evidence.',
};

export default function ManifestoPage() {
  return (
    <section className="flex flex-col gap-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Manifesto</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100">Home Station Protocol</h1>
        <p className="max-w-xl text-sm text-zinc-400">
          A fragment of how we frame origin, scarcity, and acquisition. Anchored in Pasha VII – Moon
          3 – Royal Amarr Institute School.
        </p>
      </header>

      <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6 space-y-4">
        <p className="text-sm text-zinc-300 leading-relaxed">
          Pasha VII – Moon 3 is where most pilots remember <em>learning the interface</em> but
          forget learning themselves.
        </p>
        <p className="text-sm text-zinc-300 leading-relaxed">
          When you <strong>initiate acquisition</strong>, you’re not buying nostalgia. You’re
          claiming a teaching tool from a specific orbit in time: Pasha VII – Moon 3, where the idea
          of “home station” first wrapped itself around your spine.
        </p>
        <p className="text-sm text-zinc-300 leading-relaxed">
          We preserve artifacts – digital and physical – as evidence that a human hand was here.
          Hashes, provenance, and story stay on the record. No cinematic upgrades, no DRM scarring.
          All systems aim to be auditable, anti-Druj, and kind to future readers.
        </p>
        <p className="text-xs text-zinc-500 pt-2">
          Origin: Pasha VII – Moon 3 – Royal Amarr Institute School.
        </p>
      </article>

      <div className="rounded-xl border border-amber-300/40 bg-amber-300/5 px-4 py-4 text-xs text-amber-100">
        <p className="font-semibold tracking-[0.18em] uppercase mb-2">Full lore artifact</p>
        <p className="text-zinc-300">
          The full disc narrative lives in{' '}
          <code className="text-amber-200/90">docs/PASHA-VII-HOME-STATION.mdx</code> in the repo –
          scarcity index, origin, and the full text of the preserved training simulation from that
          moon.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/archive"
          className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/60 transition-colors"
        >
          Archive
        </Link>
        <Link
          href="/verification"
          className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/60 transition-colors"
        >
          Verification
        </Link>
      </div>
    </section>
  );
}
