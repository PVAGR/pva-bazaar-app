/**
 * Canonical base URL for the site (sitemap, robots, etc.).
 * Prefers NEXT_PUBLIC_SITE_URL, then VERCEL_URL, then https://pvabazaar.org.
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://pvabazaar.org";
}
