import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Partners Directory – PVA Bazaar",
  description:
    "Businesses and websites in the PVA Bazaar partner network. Each partner owns an editable, MySpace-style page for their story, commodities, services and contact.",
  alternates: {
    canonical: "/partners",
  },
  openGraph: {
    title: "Partners Directory – PVA Bazaar",
    description:
      "The businesses we work with — craft cooperatives, marketplaces, galleries and more, each with their own live page.",
    url: `${getBaseUrl()}/partners`,
    type: "website",
  },
};

export default function PartnersLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
