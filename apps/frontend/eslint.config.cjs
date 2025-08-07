/* -----------------  apps/frontend/eslint.config.cjs  -------------- */
/* Angular-specific rules + selector prefixes for the front-end app. */

const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
  /* Angular + inline-template processing for TS files */
  ...compat
    .config({
      extends: ['plugin:@nx/angular', 'plugin:@angular-eslint/template/process-inline-templates'],
    })
    .map((cfg) => ({
      ...cfg,
      files: ['**/*.ts'],
      rules: {
        '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'pc', style: 'camelCase' }],
        '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'pc', style: 'kebab-case' }],
      },
    })),

  /* Stand-alone HTML templates */
  ...compat
    .config({
      extends: ['plugin:@nx/angular-template', 'plugin:@angular-eslint/template/recommended'],
    })
    .map((cfg) => ({
      ...cfg,
      files: ['**/*.html'],
      rules: {
        '@angular-eslint/template/no-negated-async': 'error',
        '@angular-eslint/template/i18n': [
          'warn',
          {
            checkId: true,
            checkText: true,
            ignoreAttributes: ['routerLink', 'formControlName', 'ngModel'],
          },
        ],
      },
    })),
];
