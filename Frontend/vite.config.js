import { defineConfig } from 'vite';
import path from 'path';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';

// Recursively copy directory
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'magnum-opus': path.resolve(__dirname, 'magnum-opus.html'),
      },
    },
  },
  plugins: [
    {
      name: 'copy-static-files',
      closeBundle() {
        // Copy all static HTML directories
        const dirs = ['writings', 'biography', 'novel', 'research'];
        dirs.forEach((dir) => {
          const srcPath = path.resolve(__dirname, dir);
          const destPath = path.resolve(__dirname, 'dist', dir);
          try {
            copyDir(srcPath, destPath);
            console.log(`Copied ${dir}/ to dist/`);
          } catch (err) {
            console.warn(`Could not copy ${dir}:`, err.message);
          }
        });

        // Note: index.html is already handled by Vite's build process
        // DO NOT copy the raw source index.html or it will break bundled assets

        // Copy magnum-opus.html
        try {
          copyFileSync(
            path.resolve(__dirname, 'magnum-opus.html'),
            path.resolve(__dirname, 'dist', 'magnum-opus.html'),
          );
          console.log('Copied magnum-opus.html to dist/');
        } catch (err) {
          console.warn('Could not copy magnum-opus.html:', err.message);
        }
      },
    },
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
