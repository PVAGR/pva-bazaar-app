import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'Frontend',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 3000
  }
});