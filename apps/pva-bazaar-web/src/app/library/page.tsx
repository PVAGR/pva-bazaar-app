import type { Metadata } from "next";
import Link from "next/link";
import { LibraryGrid } from "./LibraryGrid";

export const metadata: Metadata = {
  title: "Library – PVA Bazaar",
  description:
    "Marketplace library of published books from the PVA Bazaar federation. Read in the browser, download PDF or EPUB, and discover new works.",
  alternates: {
    canonical: "/library",
  },
  openGraph: {
    title: "Library – PVA Bazaar",
    description:
      "Marketplace library of published books. Browse, read in the browser, and download PDF or EPUB.",
    url: "/library",
    type: "website",
  },
};

export default function LibraryPage() {
  return (
    <section className="flex w-full flex-col gap-8">
      <header className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
          Marketplace · Library
        </p>
        <h1 className="text-3xl font-semibold text-zinc-100 md:text-4xl">
          Published books from the federation
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-zinc-300">
          Every book published through the PVA Bazaar publishing flow appears
          here. Read in the browser, download a clean PDF or EPUB, and follow
          the author from the marketplace back to the archive.
        </p>
        <div className="flex flex-wrap gap-3 pt-1 text-xs">
          <Link
            href="/library/publish"
            className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/20"
          >
            Publish a book
          </Link>
          <Link
            href="/archive"
            className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700/60"
          >
            Browse archive
          </Link>
        </div>
      </header>

      <LibraryGrid />
    </section>
  );
}
