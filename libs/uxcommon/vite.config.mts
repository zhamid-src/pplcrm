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
      // Coverage ratchet: set just under the measured baseline (2026-07-04:
      // 81.22% stmts / 63.21% branch / 67.05% funcs / 82.27% lines). These may
      // only ever be raised, never lowered — if your change drops coverage
      // below them, add tests rather than editing the thresholds.
      thresholds: {
        statements: 80,
        branches: 62,
        functions: 66,
        lines: 81,
      },
    },
  },
}));
