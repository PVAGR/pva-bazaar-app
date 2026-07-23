"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildAssetUrl,
  buildDownloadUrl,
  deleteBook,
  isAdminUser,
  listPublicBooks,
  type LibraryBook,
} from "@/lib/libraryApi";

type LoadState = "loading" | "ready" | "error" | "empty" | "offline";

const GENRE_OPTIONS = [
  { value: "", label: "All genres" },
  { value: "general", label: "General" },
  { value: "teaching", label: "Teaching" },
  { value: "history", label: "History" },
  { value: "poetry", label: "Poetry" },
  { value: "fiction", label: "Fiction" },
  { value: "ritual", label: "Ritual" },
  { value: "manual", label: "Manual" },
  { value: "children", label: "Children" },
];

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

function wordLabel(count: number): string {
  if (!count) return "— words";
  if (count < 1000) return `${count} words`;
  return `${(count / 1000).toFixed(1)}k words`;
}

export function LibraryGrid() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [admin, setAdmin] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    setAdmin(isAdminUser());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setError(null);
    listPublicBooks({ limit: 60 })
      .then((data) => {
        if (cancelled) return;
        setBooks(data.items || []);
        if ((data.items || []).length === 0) {
          setState("empty");
        } else {
          setState("ready");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Library unavailable";
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
  }, []);

  const visible = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return books.filter((book) => {
      if (genre && (book.genre || "").toLowerCase() !== genre) {
        return false;
      }
      if (!lowered) return true;
      const haystack = [
        book.title,
        book.subtitle,
        book.authorName,
        book.description,
        book.slug,
        book.genre,
        book.audience,
        book.language,
      ]
        .filter(Boolean)
        .map((field) => String(field).toLowerCase())
        .join(" ");
      return haystack.includes(lowered);
    });
  }, [books, query, genre]);

  async function handleDelete(book: LibraryBook) {
    if (!window.confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
    setDeleting(book.id);
    try {
      await deleteBook(book.id);
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, author, or keyword"
          className="min-w-[220px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
          aria-label="Search books"
        />
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
          aria-label="Filter by genre"
        >
          {GENRE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500">
          {visible.length} of {books.length} {books.length === 1 ? "book" : "books"}
        </p>
      </div>

      {state === "loading" && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-6 text-sm text-zinc-400">
          Loading the marketplace library…
        </div>
      )}

      {state === "offline" && (
        <div className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-5 text-sm text-amber-200">
          <p className="font-semibold text-amber-100">Library service is not connected.</p>
          <p className="mt-1 text-amber-200/80">
            The sanctuary cannot reach the publishing API. Set
            <code className="mx-1 rounded bg-amber-900/40 px-1 text-amber-100">NEXT_PUBLIC_API_URL</code>
            to <code className="mx-1 rounded bg-amber-900/40 px-1 text-amber-100">https://api.pvabazaar.org</code>{" "}
            on the deploy.
          </p>
        </div>
      )}

      {state === "error" && (
        <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-5 text-sm text-red-200">
          <p className="font-semibold text-red-100">Could not load the library.</p>
          <p className="mt-1 text-red-200/80">{error}</p>
        </div>
      )}

      {state === "empty" && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-6 text-sm text-zinc-300">
          <p className="font-semibold text-zinc-100">No books have been published yet.</p>
          <p className="mt-1 text-zinc-400">
            The marketplace library lights up the moment the first book is published.
            Use <Link href="/library/publish" className="text-amber-300 hover:text-amber-200">Publish a book</Link> to add the opening volume.
          </p>
        </div>
      )}

      {state === "ready" && visible.length === 0 && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-6 text-sm text-zinc-300">
          <p className="font-semibold text-zinc-100">No matches.</p>
          <p className="mt-1 text-zinc-400">Try a different search term or clear the genre filter.</p>
        </div>
      )}

      {visible.length > 0 && (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((book) => {
            const cover = buildAssetUrl(book, "front");
            const pdfHref = buildDownloadUrl(book, "pdf");
            const epubHref = buildDownloadUrl(book, "epub");
            return (
              <li
                key={book.id || book.slug}
                className="flex h-full flex-col gap-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5"
              >
                <div className="flex gap-4">
                  <div className="h-32 w-24 shrink-0 overflow-hidden rounded-md border border-zinc-800/80 bg-zinc-900/80">
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
                  <div className="flex flex-1 flex-col gap-1">
                    <h2 className="text-base font-semibold text-zinc-100">{book.title}</h2>
                    {book.subtitle && (
                      <p className="text-xs text-zinc-400">{book.subtitle}</p>
                    )}
                    <p className="text-xs text-zinc-500">
                      {book.authorName ? `by ${book.authorName}` : "Author unknown"}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">
                      {(book.genre || "general")} · {wordLabel(book.wordCount)}
                    </p>
                    {book.publishedAt && (
                      <p className="text-[11px] text-zinc-500">
                        Published {formatDate(book.publishedAt)}
                      </p>
                    )}
                  </div>
                </div>

                {book.description && (
                  <p className="line-clamp-3 text-sm leading-6 text-zinc-300">
                    {book.description}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Link
                    href={`/library/${encodeURIComponent(book.slug)}`}
                    className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-300/20"
                  >
                    Read in browser
                  </Link>
                  {pdfHref && (
                    <a
                      href={pdfHref}
                      className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-3 py-2 text-xs font-medium text-zinc-100 transition-colors hover:bg-zinc-700/60"
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF
                    </a>
                  )}
                  {epubHref && (
                    <a
                      href={epubHref}
                      className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-3 py-2 text-xs font-medium text-zinc-100 transition-colors hover:bg-zinc-700/60"
                      target="_blank"
                      rel="noreferrer"
                    >
                      EPUB
                    </a>
                  )}
                  {admin && (
                    <button
                      type="button"
                      disabled={deleting === book.id}
                      onClick={() => handleDelete(book)}
                      className="rounded-lg border border-red-700/60 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-900/50 disabled:opacity-50"
                    >
                      {deleting === book.id ? "Deleting…" : "Delete"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
