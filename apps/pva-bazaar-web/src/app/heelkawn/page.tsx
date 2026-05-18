import type { Metadata } from "next";
import { getLiveRepoSignal } from "@/lib/heelkawn-ops";

const HEELKAWN_DOWNLOAD_URL =
  normalizeExternalUrl(
    process.env.NEXT_PUBLIC_HEELKAWN_DOWNLOAD_URL,
    "https://github.com/PVAGR/HeelKawn1/releases/latest",
  );

const HEELKAWN_PC_DOWNLOAD_URL =
  normalizeExternalUrl(
    process.env.NEXT_PUBLIC_HEELKAWN_PC_DOWNLOAD_URL,
    "https://github.com/PVAGR/HeelKawn1/releases/latest",
  );

const HEELKAWN_REPO_URL =
  normalizeExternalUrl(
    process.env.NEXT_PUBLIC_HEELKAWN_REPO_URL,
    "https://github.com/PVAGR/HeelKawn1",
  );

export const metadata: Metadata = {
  title: "HeelKawn – PVA Bazaar",
  description:
    "HeelKawn Armory hub with mobile/PC downloads, profile context, and repository updates.",
};

export default async function HeelKawnPage() {
  const signal = await getLiveRepoSignal(HEELKAWN_REPO_URL);
  const now = new Date();
  const cycle =
    now.getHours() < 5
      ? "Deep night watch"
      : now.getHours() < 11
        ? "Morning build cycle"
        : now.getHours() < 17
          ? "Daylight operations"
          : now.getHours() < 21
            ? "Dusk patrol cycle"
            : "Night relay cycle";

  return (
    <section className="flex w-full flex-col gap-8">
      <header className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
          HeelKawn
        </p>
        <h1 className="text-3xl font-semibold text-zinc-100 md:text-4xl">
          HeelKawn download hub
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-zinc-300">
          HeelKawn is a live simulation stack with continuous settlement activity,
          equipment-aware sprites, and synchronized social relays. Use the
          build links below and jump into the Armory on the main web app.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <a
            href={HEELKAWN_DOWNLOAD_URL}
            className="inline-flex items-center rounded-lg border border-amber-300/50 bg-amber-300/10 px-5 py-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-300/20"
            target="_blank"
            rel="noreferrer"
          >
            Download for Android
          </a>
          <a
            href={HEELKAWN_PC_DOWNLOAD_URL}
            className="inline-flex items-center rounded-lg border border-amber-300/50 bg-amber-300/10 px-5 py-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-300/20"
            target="_blank"
            rel="noreferrer"
          >
            Download for PC
          </a>
          <a
            href={HEELKAWN_REPO_URL}
            className="inline-flex items-center rounded-lg border border-zinc-600 bg-zinc-800/60 px-5 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700/60"
            target="_blank"
            rel="noreferrer"
          >
            Open GitHub repo
          </a>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-zinc-800/80 bg-black/30 p-5">
          <h2 className="text-sm font-semibold text-zinc-100">Live status</h2>
          <dl className="mt-3 grid gap-2 text-sm text-zinc-300">
            <div className="flex items-center justify-between gap-4 rounded border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
              <dt>World cycle</dt>
              <dd className="font-medium text-zinc-100">{cycle}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
              <dt>Last synced</dt>
              <dd className="font-medium text-zinc-100">
                {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
              <dt>Delivery channel</dt>
              <dd className="font-medium text-zinc-100">GitHub releases</dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
              <dt>Latest release</dt>
              <dd className="font-medium text-zinc-100">{signal.releaseTag}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
              <dt>Release published</dt>
              <dd className="font-medium text-zinc-100">{signal.releaseDate}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-xl border border-zinc-800/80 bg-black/30 p-5">
          <h2 className="text-sm font-semibold text-zinc-100">Repository pulse</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-300">
            Latest commit: <span className="text-zinc-100">{signal.commitMessage}</span>
            <br />
            Commit time: <span className="text-zinc-100">{signal.commitDate}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href={signal.releaseUrl}
              className="inline-flex items-center rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700/60"
              target="_blank"
              rel="noreferrer"
            >
              Open latest release
            </a>
            <a
              href={signal.commitUrl}
              className="inline-flex items-center rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700/60"
              target="_blank"
              rel="noreferrer"
            >
              Open latest commit
            </a>
          </div>
        </article>
      </section>
    </section>
  );
}

function normalizeExternalUrl(candidate: string | undefined, fallback: string): string {
  if (!candidate) return fallback;
  try {
    const url = new URL(candidate);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}
