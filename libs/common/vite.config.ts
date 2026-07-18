/// <reference types='vitest' />
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/common',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [],
  test: {
    name: 'common',
    watch: false,
    globals: true,
    passWithNoTests: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/common',
      provider: 'v8' as const,
      // Coverage ratchet: set just under the measured baseline (2026-07-17:
      // 98.04% stmts / 90.31% branch / 100% funcs / 98.41% lines); held slightly
      // below so one new helper file doesn't instantly break the build, but keep
      // raising it as the lib grows. Never lower these — add tests instead.
      thresholds: {
        statements: 96,
        branches: 90,
        functions: 98,
        lines: 96,
      },
    },
  },
}));
