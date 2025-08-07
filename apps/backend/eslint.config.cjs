/* ---------------------------------------------------------------
 *  apps/backend/eslint.config.cjs
 *  Node-focused rules for the backend application
 * -------------------------------------------------------------- */

const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js'); // gives us a ready-made recommended config

/* FlatCompat now needs the recommendedConfig param */
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  /* Apply Nx’s JavaScript/TypeScript rules to every source file here */
  ...compat.config({ extends: ['plugin:@nx/javascript'] }).map((cfg) => ({
    ...cfg,
    files: ['**/*.{ts,tsx,js,jsx}'],
  })),
];
