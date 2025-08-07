/* ---------------------- apps/backend/eslint.config.cjs ---------------------- */
/* Node.js, Fastify, tRPC backend-specific rules only.                         */

const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  /* Extend the base config */
  ...compat.config({ extends: ['plugin:@nx/javascript'] }).map((cfg) => ({
    ...cfg,
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      /* Fastify/tRPC specific style preferences */
      'prefer-arrow-callback': 'warn',
      'arrow-body-style': ['warn', 'as-needed'],
      // Optional: Add backend-only rules here
    },
  })),
];
