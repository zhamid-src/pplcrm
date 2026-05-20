/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/backend',
  plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  test: {
    name: 'backend',
    watch: false,
    globals: true,
    
  plugins: [nxViteTsPaths()],
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
