/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/frontend',
  resolve: {
    tsconfigPaths: true,
    alias: {
      'apps/frontend/src': __dirname + '/src',
    },
  },
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/.angular/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [angular()],
  test: {
    name: 'frontend',
    watch: false,
    globals: true,
    passWithNoTests: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/frontend',
      provider: 'v8' as const,
    },
    // Suppress NG0914: Angular fires this when provideZonelessChangeDetection() is used
    // alongside Zone.js (which the Angular testing harness always loads). It's harmless.
    onConsoleLog(log: string) {
      if (log.includes('NG0914')) return false;
    },
  },
}));
