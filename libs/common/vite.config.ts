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
    },
  },
}));
