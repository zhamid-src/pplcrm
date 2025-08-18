/* ----------------------  eslint.config.cjs  ---------------------- */
/* Root flat-config shared by every project in the workspace.        */
/* PASTE THE WHOLE FILE – it replaces the previous version.          */

const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const globals = require('globals');
const nxPlugin = require('@nx/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

const compat = new FlatCompat({ baseDirectory: __dirname, recommendedConfig: js.configs.recommended });

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  /* 0️⃣  Ignored files globally */
  { ignores: ['node_modules', 'dist'] },

  /* 1️⃣  Core JS recommendations */
  js.configs.recommended,

  /* 2️⃣  Nx + Prettier shared base */
  ...compat.config({
    extends: ['plugin:@nx/typescript', 'prettier'],
  }),

  /* 3️⃣  Workspace-wide TypeScript rules ------------------------------ */
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.base.json'],
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      /* Shared TS best practices */
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',

      /* General best practices */
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  /* 4️⃣  Enforce Nx module boundaries ---------------------------------- */
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: { '@nx': nxPlugin },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
        },
      ],
    },
  },
];
