"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  buildAssetUrl,
  buildDownloadUrl,
  getPublicBook,
  type LibraryBook,
} from "@/lib/libraryApi";

type State = "loading" | "ready" | "error" | "offline" | "missing";

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function BookReader({ slug }: { slug: string }) {
  const [book, setBook] = useState<LibraryBook | null>(null);
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setState("missing");
      return;
    }
    let cancelled = false;
    setState("loading");
    setError(null);
    getPublicBook(slug)
      .then((data) => {
        if (cancelled) return;
        setBook(data.item);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Unable to load this book";
        if (/not configured/i.test(message)) {
          setState("offline");
        } else {
          setState("error");
        }
        setError(message);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state === "loading") {
    return (
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-6 text-sm text-zinc-400">
        Loading this volume…
      </div>
    );
  }

  if (state === "missing") {
    return (
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-6 text-sm text-zinc-300">
        <p className="font-semibold text-zinc-100">No slug provided.</p>
        <p className="mt-1 text-zinc-400">
          Open a book from the <Link href="/library" className="text-amber-300 hover:text-amber-200">library index</Link>.
        </p>
      </div>
    );
  }

  if (state === "offline") {
    return (
      <div className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-5 text-sm text-amber-200">
        <p className="font-semibold text-amber-100">Library service is not connected.</p>
        <p className="mt-1 text-amber-200/80">{error}</p>
      </div>
    );
  }

  if (state === "error" || !book) {
    return (
      <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-5 text-sm text-red-200">
        <p className="font-semibold text-red-100">Could not load this book.</p>
        <p className="mt-1 text-red-200/80">{error}</p>
      </div>
    );
  }

  const cover = buildAssetUrl(book, "front");
  const back = buildAssetUrl(book, "back");
  const pdfHref = buildDownloadUrl(book, "pdf");
  const epubHref = buildDownloadUrl(book, "epub");
  const apiViewHref = book.links?.apiView || "";

  return (
    <article className="flex flex-col gap-8">
      <header className="grid gap-6 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
            Library · {book.genre || "general"}
          </p>
          <h1 className="text-3xl font-semibold text-zinc-100 md:text-4xl">{book.title}</h1>
          {book.subtitle && <p className="text-base text-zinc-300">{book.subtitle}</p>}
          <p className="text-sm text-zinc-400">
            {book.authorName ? `by ${book.authorName}` : "Author unknown"}
          </p>
          {book.publishedAt && (
            <p className="text-xs text-zinc-500">Published {formatDate(book.publishedAt)}</p>
          )}
          {book.description && (
            <p className="pt-2 text-sm leading-7 text-zinc-300">{book.description}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            {pdfHref && (
              <a
                href={pdfHref}
                className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/20"
                target="_blank"
                rel="noreferrer"
              >
                Download PDF
              </a>
            )}
            {epubHref && (
              <a
                href={epubHref}
                className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700/60"
                target="_blank"
                rel="noreferrer"
              >
                Download EPUB
              </a>
            )}
            {apiViewHref && (
              <a
                href={apiViewHref}
                className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700/60"
                target="_blank"
                rel="noreferrer"
              >
                Open raw view
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="h-64 w-48 overflow-hidden rounded-md border border-zinc-800/80 bg-zinc-900/80 shadow-lg">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt={`Cover for ${book.title}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-center text-[10px] uppercase tracking-widest text-zinc-500">
                No cover
              </div>
            )}
          </div>
          {back && (
            <div className="h-40 w-32 overflow-hidden rounded-md border border-zinc-800/80 bg-zinc-900/80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={back}
                alt={`Back cover of ${book.title}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </header>

      <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6">
        <h2 className="text-lg font-semibold text-zinc-100">Read in the browser</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Rendered HTML is loaded directly from the publishing API. Use the PDF or EPUB downloads for a clean offline copy.
        </p>
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800/80 bg-black/40">
          {apiViewHref ? (
            <iframe
              title={`${book.title} reader`}
              src={apiViewHref}
              className="h-[70vh] w-full"
              loading="lazy"
            />
          ) : (
            <p className="p-6 text-sm text-zinc-400">Reader is unavailable for this volume.</p>
          )}
        </div>
      </section>
    </article>
  );
}
