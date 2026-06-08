/* ---------------------- apps/backend/eslint.config.cjs ---------------------- */
/* Node.js, Fastify, tRPC backend-specific rules only.                         */

const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const localRules = require('../../tools/eslint-rules/index.cjs');

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
    },
  })),

  /* ── Tenant-isolation lint rule ────────────────────────────────────────────
   *
   * Flags any Kysely query chain (selectFrom / updateTable / deleteFrom) that
   * reaches an execute terminal without a .where('tenant_id', …) filter.
   *
   * Scoped to modules/** only — excludes:
   *   - base.repo.ts          (tenant filtering is callers' responsibility)
   *   - job-handlers.ts       (per-tenant loops; tenant_id used inside trx)
   *   - _migrations/**        (DDL; no runtime tenant scoping)
   *   - *.spec.ts             (integration tests do their own scoped cleanup)
   *   - kyselyinit*.ts        (migration runner)
   * ─────────────────────────────────────────────────────────────────────── */
  {
    files: ['src/app/modules/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    plugins: { local: localRules },
    rules: {
      'local/no-unscoped-db-query': [
        'error',
        {
          // Tables where cross-tenant queries are intentional:
          //   authusers         - login by email, password reset by code
          //   sessions          - sign-out by session_id hash (no tenant in token)
          //   tenants           - tenant lookup by id
          //   tags              - system-level tag reads (scoped at query join level)
          //   ms_oauth_tokens   - keyed by user_id (globally unique bigint); single-user scope is sufficient
          //   google_oauth_tokens - same reasoning as ms_oauth_tokens
          ignoreTables: ['authusers', 'sessions', 'tenants', 'tags', 'ms_oauth_tokens', 'google_oauth_tokens'],
        },
      ],
    },
  },
];
