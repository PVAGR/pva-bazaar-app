import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex flex-col gap-8 py-12">
      <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
        404
      </p>
      <h1 className="text-2xl font-semibold text-zinc-100">
        This path is not in the archive.
      </h1>
      <p className="max-w-sm text-sm text-zinc-400">
        The page you’re looking for doesn’t exist or has moved. Return to the
        sanctuary and try Archive, Verification, or Manifesto.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-300/20 transition-colors"
        >
          Home
        </Link>
        <Link
          href="/archive"
          className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/60 transition-colors"
        >
          Archive
        </Link>
      </div>
    </section>
  );
}
