import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/siteUrl';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getBaseUrl();
  const now = new Date();
  const routes = [
    { path: '', priority: 1, changeFrequency: 'daily' as const },
    { path: '/get-started', priority: 0.95, changeFrequency: 'weekly' as const },
    { path: '/archive', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/verification', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/manifesto', priority: 0.85, changeFrequency: 'weekly' as const },
    { path: '/heelkawn', priority: 0.85, changeFrequency: 'daily' as const },
    { path: '/recovery', priority: 0.85, changeFrequency: 'daily' as const },
    { path: '/dashboard', priority: 0.7, changeFrequency: 'daily' as const },
    { path: '/deals', priority: 0.7, changeFrequency: 'daily' as const },
    { path: '/conference', priority: 0.7, changeFrequency: 'daily' as const },
    { path: '/cart', priority: 0.6, changeFrequency: 'weekly' as const },
  ].map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
  return routes;
}
