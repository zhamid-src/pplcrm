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
      DB_USER: 'test',
      DB_NAME: 'test',
      DB_PASSWORD: 'test',
      JWT_SECRET: 'test'
    },

    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/backend',
      provider: 'v8' as const,
    },
  },
}));
