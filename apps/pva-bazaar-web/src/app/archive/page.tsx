import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Archive – PVA Bazaar",
  description:
    "Kenyan crafts as living artifacts. Beadwork and Kisii soapstone; Phase One SKUs; Pasha VII. Checkout via Etsy for now.",
};

export default function ArchivePage() {
  return (
    <section className="flex flex-col gap-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
          Archive · Phase One
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100">
          Kenyan crafts as living artifacts.
        </h1>
        <p className="max-w-xl text-sm text-zinc-400">
          This first shelf of the archive holds hand-made beadwork and Kisii
          soapstone pieces. Each item is small enough to ship, but carries a
          long story in its pattern and stone.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
          <h2 className="mb-1 text-sm font-semibold text-zinc-100">
            Beadwork · Maasai signal circuit
          </h2>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-zinc-500">
            Bracelets · Necklaces · Anklets · Earrings
          </p>
          <p className="mb-3 text-sm text-zinc-300">
            Five core designs:{" "}
            <span className="text-zinc-100">
              Maasai Sunrise, Pamoja Pathways, Kisumu Waters, Eldoret Ember,
              Maasai Signal
            </span>
            . Lightweight, made to travel, rooted in specific Kenyan places and
            co‑ops.
          </p>
          <p className="text-xs text-zinc-500">
            For now, purchase flows through curated Etsy listings so we can
            move quickly while the in‑house cart and verification layers
            mature.
          </p>
        </article>

        <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5">
          <h2 className="mb-1 text-sm font-semibold text-zinc-100">
            Soapstone · Kisii guardians
          </h2>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-zinc-500">
            Elephants · Memory Bowls · Totems
          </p>
          <p className="mb-3 text-sm text-zinc-300">
            Carved in Tabaka from Kisii stone, then polished and sometimes
            etched. These are desk guardians and altar anchors – physical
            reminders that a story has weight.
          </p>
          <p className="text-xs text-zinc-500">
            Each piece is slightly different. That variance is part of the
            evidence that a human hand was here.
          </p>
        </article>
      </div>

      <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/50 px-4 py-4">
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">
          Phase One SKUs (8)
        </p>
        <ul className="text-xs text-zinc-400 space-y-0.5 columns-1 sm:columns-2 gap-x-4">
          <li>Maasai Sunrise Beaded Bracelet</li>
          <li>Pamoja Pathways Necklace</li>
          <li>Kisumu Waters Minimalist Anklet</li>
          <li>Eldoret Ember Choker</li>
          <li>Maasai Signal Earrings (Pair)</li>
          <li>Tabaka Guardian Elephant – Mini</li>
          <li>Kisii Memory Bowl – Etched Interior</li>
          <li>Axis of Stories Totem</li>
        </ul>
      </div>

      <div className="rounded-xl border border-amber-300/60 bg-amber-300/5 px-4 py-4 text-xs text-amber-100">
        <p className="mb-2 font-semibold tracking-[0.18em] uppercase">
          How to actually claim an artifact (for now)
        </p>
        <p className="mb-2">
          As of this phase, checkout for Kenyan crafts happens on external
          marketplaces (Etsy and friends). This keeps payments, taxes, and
          logistics stable while we treat{" "}
          <span className="font-semibold">pvabazaar.org</span> as the ritual
          layer: the place where stories, hashes, and provenance live.
        </p>
        {process.env.NEXT_PUBLIC_ETSY_SHOP_URL && (
          <p className="mb-2">
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
        <p>
          Later, the archive pages here will link directly into those listings,
          and eventually into an in‑house cart and verification dashboard.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/40 p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-1">
          Featured artifact
        </p>
        <h2 className="text-sm font-semibold text-zinc-100 mb-1">
          Pasha VII – Moon 3 – Royal Amarr Institute School
        </h2>
        <p className="text-sm text-zinc-400">
          A disc from the dorm alcove two bulkheads down from the main hangar.
          Hash-matched, no cinematic upgrades. When you initiate acquisition,
          you claim a teaching tool from a specific orbit in time. Full lore in{" "}
          <code className="text-zinc-300">docs/PASHA-VII-HOME-STATION.mdx</code>.
        </p>
      </div>

      <p className="text-[11px] text-zinc-500">
        Internal note: SKU list and Etsy copy in{" "}
        <code className="text-zinc-300">docs/PRODUCT-SOURCING-KENYA.md</code> and{" "}
        <code className="text-zinc-300">docs/ETSY-LISTINGS-KENYA.md</code>; order
        workflow and canned messages in{" "}
        <code className="text-zinc-300">docs/OPS-ORDER-WORKFLOW.md</code> and{" "}
        <code className="text-zinc-300">docs/OPS-CUSTOMER-MESSAGES.md</code>; inventory
        template in <code className="text-zinc-300">docs/OPS-INVENTORY-TEMPLATE.csv</code>.
      </p>
    </section>
  );
}

