'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex flex-col gap-8 py-12">
      <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Something went wrong</p>
      <h1 className="text-2xl font-semibold text-zinc-100">The sanctuary hit a snag.</h1>
      <p className="max-w-sm text-sm text-zinc-400">
        We couldn’t load this page. You can try again or return to the archive.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-300/20 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/60 transition-colors"
        >
          Home
        </Link>
      </div>
    </section>
  );
}
