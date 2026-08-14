import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Referral Program – PVA Bazaar",
  description:
    "Get a personal PVA Bazaar referral code, share your link anywhere, and earn 10% of every sale you drive — tracked and recorded automatically. Free, no account needed.",
  alternates: {
    canonical: "/referrals",
  },
  openGraph: {
    title: "Referral Program – PVA Bazaar",
    description:
      "Earn 10% of every sale you drive with your personal PVA Bazaar referral code. No subscription, no fees, forever.",
    url: `${getBaseUrl()}/referrals`,
    type: "website",
  },
};

export default function ReferralsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
