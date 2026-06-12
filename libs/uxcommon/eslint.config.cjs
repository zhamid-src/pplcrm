const { FlatCompat } = require('@eslint/eslintrc');
const path = require('path');

const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
  ...compat
    .config({
      extends: ['plugin:@nx/angular', 'plugin:@angular-eslint/template/process-inline-templates'],
      parserOptions: {
        project: [
          path.resolve(__dirname, 'tsconfig.lib.json'),
          path.resolve(__dirname, 'tsconfig.spec.json'),
          path.resolve(__dirname, '../../tsconfig.base.json'),
        ],
        sourceType: 'module',
      },
    })
    .map((cfg) => ({
      ...cfg,
      files: ['**/*.ts'],
      rules: {
        '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'pc', style: 'camelCase' }],
        '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'pc', style: 'kebab-case' }],
      },
    })),

  ...compat
    .config({
      extends: ['plugin:@nx/angular-template', 'plugin:@angular-eslint/template/recommended'],
    })
    .map((cfg) => ({
      ...cfg,
      files: ['**/*.html'],
      rules: {},
    })),
];
