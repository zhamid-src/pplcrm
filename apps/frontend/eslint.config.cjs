/* -----------------  apps/frontend/eslint.config.cjs  -------------- */
/* Angular-specific rules + selector prefixes for the front-end app.  */
/* PASTE THE WHOLE FILE – it replaces the previous version.           */

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
  ...compat.config({ extends: ['plugin:@nx/angular-template'] }).map((cfg) => ({ ...cfg, files: ['**/*.html'] })),
];
