/// <reference types='vitest' />
import { defineConfig } from 'vite';
export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/backend',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [],
  test: {
    name: 'backend',
    watch: false,
    globals: true,
    passWithNoTests: true,
    environment: 'node',
    env: {
      DB_USER: 'zeehamid',
      DB_NAME: 'pplcrm',
      DB_PASSWORD: 'Eternity#1',
      JWT_SECRET: 'dev-secret',
      SHARED_SECRET: 'dev-secret',
      DB_PORT: '5432',
      DB_HOST: 'localhost',
      DB_SSL: 'false',
    },
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/backend',
      provider: 'v8' as const,
    },
  },
}));
