import type { Metadata } from "next";
import Link from "next/link";
import { BookReader } from "./BookReader";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug || "").trim();
  return {
    title: slug ? `${slug} – Library` : "Book – PVA Bazaar Library",
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

export default function LibraryBookPage({ params }: { params: Params }) {
  const slug = decodeURIComponent(params.slug || "").trim();
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
