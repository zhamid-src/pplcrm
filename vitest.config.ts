import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['apps/frontend/vite.config.ts', 'apps/companion/vite.config.ts', 'libs/uxcommon/vite.config.mts'],
  },
});
