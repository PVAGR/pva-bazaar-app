import type { Metadata } from 'next';
import Link from 'next/link';
import { VerifyArtifactBlock } from './VerifyArtifactBlock';

export const metadata: Metadata = {
  title: 'Verification – PVA Bazaar',
  description:
    'How we verify artifact integrity: hashes, provenance, and anti-Druj. Look up verification by artifact ID or slug.',
};

export default function VerificationPage() {
  return (
    <section className="flex flex-col gap-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Verification</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100">
          How we verify integrity
        </h1>
        <p className="max-w-xl text-sm text-zinc-400">
          PVA Bazaar treats artifacts as evidence. Verification is how we keep that evidence
          trustworthy and anti-Druj.
        </p>
      </header>

      <VerifyArtifactBlock />

      <div className="space-y-6">
        <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
          <h2 className="mb-2 text-sm font-semibold text-zinc-100">What is a hash?</h2>
          <p className="text-sm text-zinc-300">
            A hash is a short fingerprint of a file or record. If even one bit changes, the hash
            changes. When we publish the hash of an artifact (image, document, metadata), you can
            recompute it yourself and confirm that what you have matches what we said we preserved.
            No “definitive edition” overwrites, no silent edits.
          </p>
        </article>

        <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
          <h2 className="mb-2 text-sm font-semibold text-zinc-100">Verification in practice</h2>
          <p className="text-sm text-zinc-300">
            For digital artifacts we store or reference, we aim to expose hashes (e.g. SHA-256) and,
            where it makes sense, link to on-chain or public logs. For physical artifacts like
            Kenyan crafts, we use documentation, photos, and provenance notes so you can trace
            origin and chain of custody. Over time, the dashboard will surface verification status
            for each item you care about.
          </p>
        </article>

        <article className="rounded-xl border border-amber-300/40 bg-amber-300/5 p-5">
          <h2 className="mb-2 text-sm font-semibold text-amber-200">Anti-Druj</h2>
          <p className="text-sm text-zinc-300">
            “Druj” here means deception, distortion, the replacement of truth with something that
            looks like it. We design for auditability: hashes on the record, clear provenance, and
            no hidden upgrades. When you acquire an artifact, you’re getting what we said – and you
            can verify that yourself.
          </p>
        </article>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-300/20 transition-colors"
        >
          My artifacts
        </Link>
        <Link
          href="/archive"
          className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/60 transition-colors"
        >
          Archive
        </Link>
        <Link
          href="/manifesto"
          className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/60 transition-colors"
        >
          Manifesto
        </Link>
      </div>
    </section>
  );
}
