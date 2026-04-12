import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getBaseUrl();
  const routes = ["", "/archive", "/verification", "/manifesto", "/dashboard", "/deals", "/conference", "/cart"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
  return routes;
}
