/**
 * Local ESLint plugin: pplcrm custom rules.
 *
 * Register as a plugin in eslint.config.cjs:
 *
 *   const localRules = require('./tools/eslint-rules');
 *   // then in a config object:
 *   plugins: { local: localRules },
 *   rules: { 'local/no-unscoped-db-query': 'error' }
 */
'use strict';

const noUnscopedDbQuery = require('./rules/no-unscoped-db-query.cjs');

module.exports = {
  rules: {
    'no-unscoped-db-query': noUnscopedDbQuery,
  },
};
