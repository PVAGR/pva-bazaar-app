import type { Metadata } from "next";
import Link from "next/link";
import { BookReader } from "./BookReader";

interface Params { slug: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug || "").trim();
  return {
    title: slug ? `${slug} – PVA Bazaar Library` : "Book – PVA Bazaar Library",
    description:
      "Read this book in the browser. Download a PDF or EPUB copy from the PVA Bazaar marketplace library.",
    alternates: {
      canonical: `/library/${encodeURIComponent(slug)}`,
    },
    openGraph: {
      title: slug ? `${slug} – PVA Bazaar Library` : "PVA Bazaar Library",
      description:
        "Read this book in the browser, with a PDF or EPUB copy from the PVA Bazaar marketplace library.",
      url: `/library/${encodeURIComponent(slug)}`,
      type: "book",
    },
  };
}

export default async function LibraryBookPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug || "").trim();
  return (
    <section className="flex w-full flex-col gap-8">
      <nav className="text-xs text-zinc-500">
        <Link href="/library" className="hover:text-amber-300">
          ← Back to the library
        </Link>
      </nav>
      <BookReader slug={slug} />
    </section>
  );
}
