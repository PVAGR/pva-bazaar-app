import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const base = getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/seller/"],
      },
    ],
    host: base,
    sitemap: `${base}/sitemap.xml`,
  };
}
