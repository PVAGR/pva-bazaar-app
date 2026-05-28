import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import { getBaseUrl } from "@/lib/siteUrl";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "PVA Bazaar – AI-Verified Preservation",
    template: "%s | PVA Bazaar",
  },
  description:
    "A digital sanctuary for scarce knowledge artifacts. Preserve history, verify integrity, and acquire artifacts as a Conscious Player.",
  keywords: [
    "PVA Bazaar",
    "verified artifacts",
    "digital archive",
    "provenance",
    "Kenya exports",
    "HeelKawn",
    "openclaw",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PVA Bazaar – AI-Verified Preservation",
    description:
      "A digital sanctuary for scarce knowledge artifacts. Preserve history, verify integrity, and acquire artifacts as a Conscious Player.",
    url: "/",
    siteName: "PVA Bazaar",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: getOgImageUrl(),
        width: 1200,
        height: 630,
        alt: "PVA Bazaar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PVA Bazaar – AI-Verified Preservation",
    description:
      "A digital sanctuary for scarce knowledge artifacts. Preserve history, verify integrity, and acquire artifacts as a Conscious Player.",
    images: [getTwitterImageUrl()],
  },
  robots: {
    index: true,
    follow: true,
  },
};

function getOgImageUrl(): string {
  const raw = process.env.NEXT_PUBLIC_OG_IMAGE_URL;
  if (raw && /^https?:\/\//i.test(raw)) {
    return raw;
  }
  return "/opengraph-image";
}

function getTwitterImageUrl(): string {
  const raw = process.env.NEXT_PUBLIC_OG_IMAGE_URL;
  if (raw && /^https?:\/\//i.test(raw)) {
    return raw;
  }
  return "/twitter-image";
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = getBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PVA Bazaar",
    url: baseUrl,
    description:
      "A digital sanctuary for scarce knowledge artifacts. Preserve history, verify integrity, and acquire artifacts as a Conscious Player.",
    inLanguage: "en-US",
    publisher: {
      "@type": "Organization",
      name: "PVA Bazaar",
      url: baseUrl,
    },
  };

  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-zinc-100`}
      >
        <script
          type="application/ld+json"
          // JSON-LD improves SEO discoverability and entity understanding.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a
          href="#main-content"
          className="absolute left-4 top-4 z-50 -translate-y-16 rounded border border-amber-300/60 bg-amber-300/20 px-3 py-2 text-sm font-medium text-amber-200 transition focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-amber-300/50"
        >
          Skip to main content
        </a>
        <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black flex flex-col">
          <header className="border-b border-zinc-800/80 bg-black/70 backdrop-blur">
            <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
              <Link href="/" className="flex items-baseline gap-2">
                <span className="text-xs tracking-[0.3em] text-zinc-500 uppercase">
                  PVA
                </span>
                <span className="text-sm font-semibold text-zinc-200">
                  Bazaar
                </span>
              </Link>
              <div className="flex items-center gap-6 text-xs font-medium text-zinc-400">
                <Link href="/get-started" className="hover:text-amber-300">
                  Get Started
                </Link>
                <Link href="/archive" className="hover:text-amber-300">
                  Archive
                </Link>
                <Link href="/verification" className="hover:text-amber-300">
                  Verification
                </Link>
                <Link href="/manifesto" className="hover:text-amber-300">
                  Manifesto
                </Link>
                <Link href="/heelkawn" className="hover:text-amber-300">
                  HeelKawn
                </Link>
                <Link href="/recovery" className="hover:text-amber-300">
                  Recovery
                </Link>
                <Link href="/meow" className="hover:text-amber-300">
                  Meow
                </Link>
                <Link href="/dashboard" className="hover:text-amber-300">
                  Dashboard
                </Link>
                <Link href="/deals" className="hover:text-amber-300">
                  Deals
                </Link>
                <Link href="/conference" className="hover:text-amber-300">
                  Conference
                </Link>
                <Link href="/cart" className="hover:text-amber-300">
                  Cart
                </Link>
              </div>
            </nav>
            <div className="border-t border-zinc-800/80 bg-zinc-950/80">
              <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                  Phase One · Kenyan exports
                </p>
                <p className="text-[10px] text-zinc-500">
                  This layer: stories, hashes, verification.
                </p>
              </div>
            </div>
          </header>

          <main id="main-content" className="mx-auto flex w-full max-w-5xl flex-1 px-4 py-10">
            {children}
          </main>

          <footer className="border-t border-zinc-800/80 px-4 py-4 text-center text-[11px] text-zinc-500">
            <p className="max-w-5xl mx-auto">
              Built as an alchemical archive for scarce knowledge. All systems
              aim to be auditable, anti‑Druj, and kind to future readers.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
