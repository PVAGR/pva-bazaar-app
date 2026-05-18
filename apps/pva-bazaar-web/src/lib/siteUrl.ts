/**
 * Canonical base URL for the site (sitemap, robots, etc.).
 * Prefers NEXT_PUBLIC_SITE_URL, then VERCEL_URL, then https://pvabazaar.org.
 */
export function getBaseUrl(): string {
  const fromEnv = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromEnv) return fromEnv;

  const fromVercel = normalizeSiteUrl(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (fromVercel) return fromVercel;

  return "https://pvabazaar.org";
}

function normalizeSiteUrl(value: string | undefined): string {
  if (!value) return "";
  try {
    const candidate = value.trim();
    const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    const url = new URL(withProtocol);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}
