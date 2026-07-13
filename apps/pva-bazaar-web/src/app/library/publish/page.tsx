import type { Metadata } from "next";
import { PublishBook } from "./PublishBook";

export const metadata: Metadata = {
  title: "Publish a book – PVA Bazaar Library",
  description:
    "Write a new book inside the sanctuary, attach cover art, and publish to the marketplace library.",
  alternates: {
    canonical: "/library/publish",
  },
  openGraph: {
    title: "Publish a book – PVA Bazaar Library",
    description:
      "Write a new book inside the sanctuary, attach cover art, and publish to the marketplace library.",
    url: "/library/publish",
    type: "website",
  },
};

export default function LibraryPublishPage() {
  return <PublishBook />;
}
