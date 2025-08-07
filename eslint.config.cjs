/* ----------------------  eslint.config.cjs  ---------------------- */
/* Root flat-config shared by every project in the workspace.        */
/* PASTE THE WHOLE FILE – it replaces the previous version.          */

const { FlatCompat } = require('@eslint/eslintrc'); // bridge to “extends:”
const js = require('@eslint/js');
const globals = require('globals');
const nxPlugin = require('@nx/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

const compat = new FlatCompat({ baseDirectory: __dirname });

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  /* 0️⃣  Anything we used to put in .eslintignore */
  { ignores: ['node_modules', 'dist'] },

  /* 1️⃣  Core JS rules */
  js.configs.recommended,

  /* 2️⃣  Nx + Prettier rules that were in “plugin:@nx/typescript, prettier” */
  ...compat.config({ extends: ['plugin:@nx/typescript', 'prettier'] }),

  /* 3️⃣  TypeScript everywhere ------------------------------------------ */
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // change the path if your root tsconfig has a different name
        project: ['./tsconfig.base.json'],
        sourceType: 'module',
      },
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {}, // add project-wide TS rules here if you like
  },

  /* 4️⃣  Nx enforce-module-boundaries (unchanged) ----------------------- */
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
