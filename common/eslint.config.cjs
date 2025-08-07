/* ---------------------------------------------------------------
 *  libs/common/eslint.config.cjs
 *  Universal shared library rules (used by frontend + backend)
 * -------------------------------------------------------------- */

const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  /* JavaScript/TypeScript base rules */
  ...compat
    .config({
      extends: [
        'plugin:@nx/javascript',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/stylistic',
      ],
      parserOptions: {
        project: ['./tsconfig.lib.json'], // Adjust if you use a different tsconfig here
        sourceType: 'module',
      },
    })
    .map((cfg) => ({
      ...cfg,
      files: ['**/*.{ts,tsx,js,jsx}'],
      rules: {
        /* Shared TypeScript rules */
        '@typescript-eslint/consistent-type-imports': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',

        /* General JS/TS best practices */
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'prefer-const': 'error',
        'no-var': 'error',
        'no-empty': ['warn', { allowEmptyCatch: true }],
      },
    })),
];
