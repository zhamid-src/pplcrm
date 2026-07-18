/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/uxcommon',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [angular()],
  test: {
    name: 'uxcommon',
    watch: false,
    globals: true,
    passWithNoTests: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/uxcommon',
      provider: 'v8' as const,
      // Coverage ratchet: set just under the measured baseline (2026-07-17:
      // 81.67% stmts / 64.37% branch / 82.97% funcs / 81.48% lines). These may
      // only ever be raised, never lowered — if your change drops coverage
      // below them, add tests rather than editing the thresholds.
      thresholds: {
        statements: 80,
        branches: 63,
        functions: 80,
        lines: 81,
      },
    },
  },
}));
