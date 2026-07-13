"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authed"; token: string; user: { name?: string; email?: string } };

const DEFAULT_GENRE = "general";
const GENRE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "teaching", label: "Teaching" },
  { value: "history", label: "History" },
  { value: "poetry", label: "Poetry" },
  { value: "fiction", label: "Fiction" },
  { value: "ritual", label: "Ritual" },
  { value: "manual", label: "Manual" },
  { value: "children", label: "Children" },
];

const AUDIENCE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "children", label: "Children" },
  { value: "youth", label: "Youth" },
  { value: "adult", label: "Adult" },
  { value: "scholar", label: "Scholar" },
];

function getApiBase(): string {
  if (typeof window === "undefined") return "";
  return String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
}

function readStoredToken(): { token: string; user: any } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("pva:book:auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.token === "string" && parsed.token.length > 4) {
      return parsed;
    }
  } catch {
    /* empty */
  }
  return null;
}

function storeAuth(token: string, user: any) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("pva:book:auth", JSON.stringify({ token, user }));
}

function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("pva:book:auth");
}

function wordCount(value: string): number {
  if (!value) return 0;
  return value.split(/\s+/).map((token) => token.trim()).filter(Boolean).length;
}

function formatNumber(n: number): string {
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(1)}k`;
}

const STORAGE_KEY = "pva:book:draft";

type Draft = {
  title: string;
  subtitle: string;
  authorName: string;
  description: string;
  genre: string;
  audience: string;
  language: string;
  manuscript: string;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  subtitle: "",
  authorName: "",
  description: "",
  genre: DEFAULT_GENRE,
  audience: "general",
  language: "en",
  manuscript: "",
};

export function PublishBook() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [frontCover, setFrontCover] = useState<File | null>(null);
  const [backCover, setBackCover] = useState<File | null>(null);
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; message: string } | null>(null);
  const draftLoaded = useRef(false);

  // Load auth + draft
  useEffect(() => {
    const stored = readStoredToken();
    if (stored) {
      setAuth({ status: "authed", token: stored.token, user: stored.user || {} });
    } else {
      setAuth({ status: "guest" });
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setDraft({ ...EMPTY_DRAFT, ...parsed });
        }
      }
    } catch {
      /* empty */
    }
    draftLoaded.current = true;
  }, []);

  // Persist draft
  useEffect(() => {
    if (!draftLoaded.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* empty */
    }
  }, [draft]);

  const liveWords = useMemo(() => wordCount(draft.manuscript), [draft.manuscript]);
  const liveChars = draft.manuscript.length;

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function appendChapter() {
    setDraft((prev) => ({
      ...prev,
      manuscript:
        prev.manuscript +
        (prev.manuscript ? "\n\n" : "") +
        "## New chapter\n\nWrite here…\n",
    }));
  }

  function clearDraft() {
    if (typeof window !== "undefined" && !window.confirm("Clear the current draft?")) return;
    setDraft(EMPTY_DRAFT);
    setFrontCover(null);
    setBackCover(null);
    setManuscriptFile(null);
    setFeedback(null);
  }

  async function submit(publish: boolean) {
    if (auth.status !== "authed") {
      setFeedback({ kind: "err", message: "Please sign in or register before saving." });
      return;
    }
    if (!draft.title.trim()) {
      setFeedback({ kind: "err", message: "Title is required." });
      return;
    }
    if (!draft.manuscript.trim() && !manuscriptFile) {
      setFeedback({ kind: "err", message: "Add manuscript text or upload a file." });
      return;
    }
    const base = getApiBase();
    if (!base) {
      setFeedback({ kind: "err", message: "NEXT_PUBLIC_API_URL is not configured." });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const form = new FormData();
      form.set("title", draft.title.trim());
      form.set("subtitle", draft.subtitle.trim());
      form.set("authorName", draft.authorName.trim());
      form.set("description", draft.description.trim());
      form.set("genre", draft.genre);
      form.set("audience", draft.audience);
      form.set("language", draft.language);
      form.set("manuscriptMarkdown", draft.manuscript);
      form.set("publish", publish ? "true" : "false");
      if (frontCover) form.set("frontCover", frontCover);
      if (backCover) form.set("backCover", backCover);
      if (manuscriptFile) form.set("manuscriptFile", manuscriptFile);
      const res = await fetch(`${base}/api/book-publishing/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `Save failed (${res.status})`);
      }
      setFeedback({
        kind: "ok",
        message: publish
          ? "Book published. It now appears in the marketplace library."
          : "Draft saved. You can publish it from this page any time.",
      });
      if (data?.item?.slug) {
        // Clear the manuscript to avoid re-submit, but keep metadata.
        setDraft((prev) => ({ ...prev, manuscript: "" }));
      }
    } catch (err) {
      setFeedback({
        kind: "err",
        message: err instanceof Error ? err.message : "Save failed",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flex w-full flex-col gap-8">
      <header className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
          Library · Publish
        </p>
        <h1 className="text-3xl font-semibold text-zinc-100 md:text-4xl">
          Write and upload a book
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-zinc-300">
          Compose in the sanctuary, attach cover art and a manuscript file, then publish
          to the marketplace library. Drafts are saved in your browser as you write.
        </p>
        <div className="flex flex-wrap gap-3 pt-1 text-xs">
          <Link
            href="/library"
            className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700/60"
          >
            Back to library
          </Link>
        </div>
      </header>

      {auth.status === "loading" && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-sm text-zinc-400">
          Checking your session…
        </div>
      )}

      {auth.status === "guest" && (
        <AuthPanel onAuthed={(token, user) => {
          storeAuth(token, user);
          setAuth({ status: "authed", token, user });
        }} />
      )}

      {auth.status === "authed" && (
        <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4 text-sm text-emerald-100">
          Signed in as <span className="font-semibold">{auth.user?.name || auth.user?.email || "author"}</span>.{" "}
          <button
            type="button"
            onClick={() => {
              clearAuth();
              setAuth({ status: "guest" });
            }}
            className="ml-2 text-xs text-emerald-200 underline hover:text-emerald-100"
          >
            Sign out
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <form
          className="space-y-5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(false);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title *">
              <input
                type="text"
                value={draft.title}
                onChange={(e) => update("title", e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
                placeholder="A Book of Teachings"
              />
            </Field>
            <Field label="Subtitle">
              <input
                type="text"
                value={draft.subtitle}
                onChange={(e) => update("subtitle", e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
                placeholder="What is this book really about?"
              />
            </Field>
            <Field label="Author name">
              <input
                type="text"
                value={draft.authorName}
                onChange={(e) => update("authorName", e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
                placeholder="Your name or pen name"
              />
            </Field>
            <Field label="Language">
              <input
                type="text"
                value={draft.language}
                onChange={(e) => update("language", e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
                placeholder="en"
              />
            </Field>
            <Field label="Genre">
              <select
                value={draft.genre}
                onChange={(e) => update("genre", e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
              >
                {GENRE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Audience">
              <select
                value={draft.audience}
                onChange={(e) => update("audience", e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
              >
                {AUDIENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={draft.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
              placeholder="A short summary that appears on the library card."
            />
          </Field>

          <Field
            label={`Manuscript · ${formatNumber(liveWords)} words · ${formatNumber(liveChars)} chars`}
            hint="Markdown is supported. Add a chapter using the button below."
          >
            <textarea
              value={draft.manuscript}
              onChange={(e) => update("manuscript", e.target.value)}
              rows={18}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-3 font-mono text-sm text-zinc-100"
              placeholder={"# Book title\n\n## Chapter one\n\nBegin here…"}
            />
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={appendChapter}
                className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-3 py-1.5 text-zinc-100 hover:bg-zinc-700/60"
              >
                + Add chapter
              </button>
              <button
                type="button"
                onClick={clearDraft}
                className="rounded-lg border border-red-700/50 bg-red-950/30 px-3 py-1.5 text-red-200 hover:bg-red-900/30"
              >
                Clear draft
              </button>
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <FileField
              label="Front cover"
              accept="image/*"
              file={frontCover}
              onChange={setFrontCover}
            />
            <FileField
              label="Back cover"
              accept="image/*"
              file={backCover}
              onChange={setBackCover}
            />
            <FileField
              label="Manuscript file"
              accept=".txt,.md,.markdown,.docx,.pdf,.epub,.html"
              file={manuscriptFile}
              onChange={setManuscriptFile}
            />
          </div>

          {feedback && (
            <div
              role="status"
              className={`rounded-lg border px-3 py-2 text-sm ${
                feedback.kind === "ok"
                  ? "border-emerald-700/60 bg-emerald-950/40 text-emerald-200"
                  : "border-red-800/60 bg-red-950/40 text-red-200"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting || auth.status !== "authed"}
              className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700/60 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save as draft"}
            </button>
            <button
              type="button"
              disabled={submitting || auth.status !== "authed"}
              onClick={() => void submit(true)}
              className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/20 disabled:opacity-50"
            >
              {submitting ? "Publishing…" : "Publish to library"}
            </button>
          </div>
        </form>

        <aside className="space-y-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5">
          <h2 className="text-sm font-semibold text-zinc-100">What happens next</h2>
          <ol className="space-y-2 text-sm leading-6 text-zinc-300">
            <li>1. Sign in or register an author account.</li>
            <li>2. Compose your book in Markdown. Drafts persist in this browser.</li>
            <li>3. Upload a cover image and a manuscript file (txt, md, docx, pdf, epub, html).</li>
            <li>4. Save as draft, or publish straight to the marketplace library.</li>
            <li>5. Readers see it at <Link href="/library" className="text-amber-300 hover:text-amber-200">/library</Link> with PDF and EPUB downloads.</li>
          </ol>
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3 text-xs text-zinc-400">
            <p className="font-semibold text-zinc-200">Tip</p>
            <p className="mt-1">
              Use <code className="text-zinc-200">## </code> for chapters and <code className="text-zinc-200">### </code> for sections.
              Empty lines become paragraph breaks.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm text-zinc-300">
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      {children}
      {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
    </label>
  );
}

function FileField({
  label,
  accept,
  file,
  onChange,
}: {
  label: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="block space-y-1 text-xs text-zinc-300">
      <span className="font-medium uppercase tracking-wider text-zinc-400">{label}</span>
      <input
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="block w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-200 file:mr-2 file:rounded file:border-0 file:bg-amber-300/20 file:px-2 file:py-1 file:text-amber-200"
      />
      {file && (
        <span className="block truncate text-[11px] text-zinc-500">{file.name}</span>
      )}
    </label>
  );
}

function AuthPanel({ onAuthed }: { onAuthed: (token: string, user: any) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const base = getApiBase();
    if (!base) {
      setError("NEXT_PUBLIC_API_URL is not configured.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const url =
        mode === "login"
          ? `${base}/api/auth/login`
          : `${base}/api/auth/register`;
      const body: Record<string, string> = { email, password };
      if (mode === "register") body.name = name;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || "Auth failed");
      if (!data?.token) throw new Error("No token returned");
      onAuthed(data.token, data.user || { name, email });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-amber-700/50 bg-amber-950/30 p-5 text-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-amber-100">
          {mode === "login" ? "Sign in to publish" : "Create an author account"}
        </h2>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="text-xs text-amber-200 underline hover:text-amber-100"
        >
          {mode === "login" ? "Need an account?" : "Have an account?"}
        </button>
      </div>
      {mode === "register" && (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Display name"
          className="w-full rounded-lg border border-amber-700/40 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
        />
      )}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="email@example.com"
        className="w-full rounded-lg border border-amber-700/40 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={4}
        placeholder="Password"
        className="w-full rounded-lg border border-amber-700/40 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
      />
      {error && (
        <p className="text-xs text-red-300" role="status">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/20 disabled:opacity-50"
      >
        {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-[11px] text-amber-200/70">
        Authors are stored in the federation; the publish flow uses your JWT to save and publish books.
      </p>
    </form>
  );
}
