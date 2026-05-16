import type { Metadata } from "next";

const HEELKAWN_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_HEELKAWN_DOWNLOAD_URL ||
  "https://github.com/PVAGR/HeelKawn1/releases/download/android-latest/HeelKawn-android.apk";

const HEELKAWN_PC_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_HEELKAWN_PC_DOWNLOAD_URL ||
  "https://github.com/PVAGR/HeelKawn1/releases/latest";

const HEELKAWN_REPO_URL =
  process.env.NEXT_PUBLIC_HEELKAWN_REPO_URL || "https://github.com/PVAGR/HeelKawn1";

export const metadata: Metadata = {
  title: "HeelKawn – PVA Bazaar",
  description:
    "HeelKawn Armory hub with mobile/PC downloads, profile context, and repository updates.",
};

export default function HeelKawnPage() {
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
          HeelKawn is the living simulation world currently in active development.
          Use this page for Android and PC downloads, then continue into the
          Armory tools on the main web app for profile, sprite customization,
          and social coordination.
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
          <h2 className="text-sm font-semibold text-zinc-100">Mobile quick steps</h2>
          <ol className="mt-3 space-y-2 text-sm text-zinc-300">
            <li>1. Open this page from your phone browser.</li>
            <li>2. Tap <strong>Download for Android</strong>.</li>
            <li>3. Open the downloaded file from your phone&apos;s downloads area.</li>
          </ol>
        </article>

        <article className="rounded-xl border border-zinc-800/80 bg-black/30 p-5">
          <h2 className="text-sm font-semibold text-zinc-100">PC + Armory flow</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-300">
            Use <strong>Download for PC</strong> for desktop installs. The default links
            point to the latest public release endpoint. You can set{" "}
            <code className="text-zinc-100">NEXT_PUBLIC_HEELKAWN_PC_DOWNLOAD_URL</code>{" "}
            for direct Windows packages and{" "}
            set <code className="text-zinc-100">NEXT_PUBLIC_HEELKAWN_DOWNLOAD_URL</code>{" "}
            for direct Android APK builds.
          </p>
        </article>
      </section>
    </section>
  );
}
