import type { Metadata } from "next";
import localFont from "next/font/local";
import { getBaseUrl } from "@/lib/siteUrl";
import { SiteNav } from "@/components/SiteNav";
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
          <SiteNav />

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
