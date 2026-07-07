#!/usr/bin/env bash
# =============================================================================
# Provision the dedicated Vitest database (`pplcrm_test`), isolated from the dev
# `pplcrm` database so a leaking/crashing spec can never touch real data.
#
# Run ONCE per machine, as a local superuser (trust auth in dev):
#     apps/backend/scripts/setup-test-db.sh
#
# This only creates the database + role grants. The schema itself is built by
# `0001_baseline` on the first `nx test backend` run, via the Vitest globalSetup
# (apps/backend/src/test-setup/global-setup.ts), which also truncates the DB to a
# clean slate before every run. Idempotent — safe to re-run.
#
# Mirrors the ownership/grant model of setup-db-roles.sql (S-2 least-privilege
# split): the DB is owned by pplcrm_owner (migrations/DDL) and pplcrm_app gets
# CRUD-only. The two roles must already exist — setup-db-roles.sql / setup.sh
# create them for the dev DB.
# =============================================================================
set -euo pipefail

SUPER="${PGSUPERUSER:-$(whoami)}"
HOST="${DB_HOST:-localhost}"
PORT="${DB_PORT:-5432}"
DB="${TEST_DB_NAME:-pplcrm_test}"

psql -h "$HOST" -p "$PORT" -U "$SUPER" -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pplcrm_owner')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pplcrm_app') THEN
    RAISE EXCEPTION 'pplcrm_owner / pplcrm_app roles are missing — run apps/backend/scripts/setup-db-roles.sql first';
  END IF;
END $$;
SQL

# CREATE DATABASE can't run inside a transaction or with IF NOT EXISTS, so guard it.
if ! psql -h "$HOST" -p "$PORT" -U "$SUPER" -d postgres -tAc \
      "SELECT 1 FROM pg_database WHERE datname = '${DB}'" | grep -q 1; then
  psql -h "$HOST" -p "$PORT" -U "$SUPER" -d postgres -v ON_ERROR_STOP=1 \
       -c "CREATE DATABASE \"${DB}\" OWNER pplcrm_owner"
  echo "Created database ${DB}."
else
  echo "Database ${DB} already exists — reapplying grants."
fi

# Schema ownership + least-privilege grants (mirrors setup-db-roles.sql §2–5).
# pplcrm_owner must own the public schema so 0001_baseline's ALTER SCHEMA and
# extension creation succeed; pplcrm_app is CRUD-only, no CREATE/DDL.
psql -h "$HOST" -p "$PORT" -U "$SUPER" -d "$DB" -v ON_ERROR_STOP=1 <<'SQL'
ALTER SCHEMA public OWNER TO pplcrm_owner;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO pplcrm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pplcrm_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pplcrm_app;
ALTER DEFAULT PRIVILEGES FOR ROLE pplcrm_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pplcrm_app;
ALTER DEFAULT PRIVILEGES FOR ROLE pplcrm_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO pplcrm_app;
SQL

echo "pplcrm_test provisioned. Schema is built on the next 'nx test backend' run."
