import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard – PVA Bazaar",
  description:
    "My artifacts: look up verification status for one or more artifact IDs. No sign-in for this MVP.",
};

export default function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
