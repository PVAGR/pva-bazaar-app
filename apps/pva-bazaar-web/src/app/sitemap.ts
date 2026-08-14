import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/siteUrl";

function getApiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_VERIFICATION_API_URL ??
    "";
  const clean = String(raw || "").replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean.slice(0, -4) : clean;
}

async function fetchLivePartnerSlugs(): Promise<string[]> {
  const apiBase = getApiBase();
  if (!apiBase) return [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${apiBase}/api/partners/public`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    const partners = Array.isArray(data?.partners) ? data.partners : [];
    return partners
      .map((p: { slug?: string }) => (p?.slug ? String(p.slug) : ""))
      .filter(Boolean)
      .slice(0, 200);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  const now = new Date();
  const staticRoutes: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
    { path: "", priority: 1, changeFrequency: "daily" },
    { path: "/get-started", priority: 0.95, changeFrequency: "weekly" },
    { path: "/archive", priority: 0.9, changeFrequency: "weekly" },
    { path: "/verification", priority: 0.9, changeFrequency: "weekly" },
    { path: "/manifesto", priority: 0.85, changeFrequency: "weekly" },
    { path: "/heelkawn", priority: 0.85, changeFrequency: "daily" },
    { path: "/meow", priority: 0.7, changeFrequency: "daily" },
    { path: "/recovery", priority: 0.85, changeFrequency: "daily" },
    { path: "/dashboard", priority: 0.7, changeFrequency: "daily" },
    { path: "/deals", priority: 0.7, changeFrequency: "daily" },
    { path: "/conference", priority: 0.7, changeFrequency: "daily" },
    { path: "/cart", priority: 0.6, changeFrequency: "weekly" },
    { path: "/library", priority: 0.85, changeFrequency: "daily" },
    { path: "/library/publish", priority: 0.6, changeFrequency: "weekly" },
    { path: "/referrals", priority: 0.8, changeFrequency: "weekly" },
    { path: "/partners", priority: 0.8, changeFrequency: "weekly" },
    { path: "/partners/apply", priority: 0.6, changeFrequency: "monthly" },
  ];

  const partnerSlugs = await fetchLivePartnerSlugs();
  const partnerRoutes = partnerSlugs.map((slug) => ({
    url: `${base}/partners/${encodeURIComponent(slug)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...partnerRoutes,
  ];
}
