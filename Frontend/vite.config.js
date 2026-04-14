
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        assets: './dist/client/assets',
      },
      release: process.env.SENTRY_RELEASE,
      dryRun: !process.env.SENTRY_AUTH_TOKEN,
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: ['fsevents'],
      output: {
        manualChunks(id) {
          if (id.includes('/src/components/governance/') || id.includes('/src/store/governanceStore')) {
            return 'governance';
          }

          if (id.includes('/src/components/AgentChat') || id.includes('/src/pages/AgentPage')) {
            return 'agent';
          }

          if (id.includes('node_modules')) {
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) {
              return 'react-core';
            }

            if (id.includes('zustand') || id.includes('axios')) {
              return 'state-network';
            }

            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'charts-core';
            }

            if (id.includes('recharts') || id.includes('/d3-')) {
              return 'charts-recharts';
            }

            if (
              id.includes('react-markdown')
              || id.includes('rehype-sanitize')
              || id.includes('mermaid')
              || id.includes('es-toolkit')
            ) {
              return 'content-render';
            }

            if (id.includes('@solana/web3.js')) {
              return 'solana';
            }

            if (id.includes('framer-motion')) {
              return 'motion';
            }

            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'https://pvabazaar.org/api',
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