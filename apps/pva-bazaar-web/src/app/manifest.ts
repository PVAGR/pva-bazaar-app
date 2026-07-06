import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/siteUrl';

export default function manifest(): MetadataRoute.Manifest {
  const base = getBaseUrl();
  return {
    name: 'PVA Bazaar',
    short_name: 'PVA Bazaar',
    description:
      'A digital sanctuary for scarce knowledge artifacts. Preserve history, verify integrity, and continue your mission across devices.',
    start_url: '/get-started',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#020617',
    lang: 'en-US',
    scope: '/',
    id: `${base}/`,
    categories: ['education', 'productivity', 'social', 'business'],
    icons: [
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
    ],
  };
}
