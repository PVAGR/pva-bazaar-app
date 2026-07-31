
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

const sentryOrg = process.env.SENTRY_ORG?.trim();
const sentryProject = process.env.SENTRY_PROJECT?.trim();
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const sentryRelease = process.env.SENTRY_RELEASE?.trim();
const hasSentryUploadConfig = Boolean(sentryOrg && sentryProject && sentryAuthToken && sentryRelease);

const sentryPlugin = hasSentryUploadConfig
  ? sentryVitePlugin({
      org: sentryOrg,
      project: sentryProject,
      authToken: sentryAuthToken,
      sourcemaps: {
        assets: './dist/client/assets',
      },
      release: sentryRelease,
      dryRun: false,
    })
  : null;

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    ...(sentryPlugin ? [sentryPlugin] : []),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: ['fsevents'],
      // Split large vendor chunks for better caching and performance
      output: {
        manualChunks: {
          'charts-vendor': ['chart.js', 'react-chartjs-2', 'recharts'],
          'mammoth-vendor': ['mammoth'],
          'markdown-vendor': ['react-markdown', 'rehype-sanitize'],
        }
      }
    },
    rolldownOptions: {
      external: ['qrcode']
    }
  },
  // Disable Rolldown to avoid qrcode resolution issues
  experimental: {
    useRolldown: false
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'https://pva-backend-api.vercel.app/api',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api/, '')
      }
    }
  },
  test: {
    environment: 'jsdom'
  }
});
