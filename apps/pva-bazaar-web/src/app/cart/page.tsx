import Link from "next/link";

export default function CartPage() {
  return (
    <section className="flex flex-col gap-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
          Cart
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100">
          Checkout for now
        </h1>
        <p className="max-w-xl text-sm text-zinc-400">
          Phase One runs on external marketplaces so we can move quickly while
          the in-house cart and verification layers mature.
        </p>
      </header>

      <div className="rounded-xl border border-amber-300/60 bg-amber-300/5 px-4 py-5 text-sm text-zinc-300">
        <p className="mb-3">
          <strong className="text-amber-200/90">Right now:</strong> Checkout for
          Kenyan crafts (beadwork, Kisii soapstone) happens on Etsy and any
          linked storefronts. Payments, taxes, and shipping are handled there.
        </p>
        <p className="mb-3">
          <strong className="text-amber-200/90">This site</strong> is the ritual
          layer: stories, hashes, provenance, and the archive. When you buy
          via Etsy, you’re still acquiring an artifact we’ve documented here.
        </p>
        <p className="mb-3">
          <strong className="text-amber-200/90">Later:</strong> We’ll add an
          in-house cart and verification dashboard so you can complete
          acquisition and see your artifacts in one place. Until then, use the
          Archive to find what’s available and follow links to the current
          listings.
        </p>
        {process.env.NEXT_PUBLIC_ETSY_SHOP_URL && (
          <p>
            <a
              href={process.env.NEXT_PUBLIC_ETSY_SHOP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-amber-200 underline hover:text-amber-100"
            >
              Shop on Etsy →
            </a>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/archive"
          className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-300/20 transition-colors"
        >
          Go to Archive
        </Link>
        {process.env.NEXT_PUBLIC_ETSY_SHOP_URL && (
          <a
            href={process.env.NEXT_PUBLIC_ETSY_SHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/60 transition-colors"
          >
            Shop on Etsy
          </a>
        )}
        <Link
          href="/"
          className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/60 transition-colors"
        >
          Home
        </Link>
      </div>
    </section>
  );
}
