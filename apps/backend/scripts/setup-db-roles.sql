-- =============================================================================
-- S-2 (schema review 2026-07-06 §6): least-privilege database role split.
--
-- Run ONCE per environment as a SUPERUSER (or the current object owner).
-- This is provisioning, NOT a Kysely migration — it creates roles, transfers
-- ownership, and changes schema privileges, which the least-privilege runtime
-- role deliberately cannot do.
--
-- After running this, point the app at the two roles:
--     DB_USER            = pplcrm_app      (runtime — CRUD only, cannot bypass RLS)
--     DB_PASSWORD        = <app password>
--     DB_MIGRATION_USER  = pplcrm_owner    (migrations — owns objects, has DDL)
--     DB_MIGRATION_PASSWORD = <owner password>
--     MIGRATE_ON_BOOT    = false           (migrations become a separate deploy step)
--
-- Why it matters: the runtime role is not an object owner, so it CANNOT bypass
-- row-level security (owners bypass their own policies) — this is the
-- prerequisite for S-1 (RLS). It also removes the runtime credential's ability
-- to DROP/ALTER/TRUNCATE, and the PUBLIC CREATE grant that lets any role plant
-- objects in the public schema.
--
-- Placeholders to replace before running:
--     :owner_pw          strong password for pplcrm_owner
--     :app_pw            strong password for pplcrm_app
--     :current_owner     the role that currently owns the tables (e.g. the dev
--                        superuser, or whatever the app connected as until now)
-- Under local `trust` auth (dev) the passwords are ignored; in production use
-- scram-sha-256 (see S-3).
-- =============================================================================

\set ON_ERROR_STOP on

-- 1. Roles ---------------------------------------------------------------------
-- Create idempotently (CREATE ROLE has no IF NOT EXISTS), then set the passwords
-- at top level — psql does not interpolate :variables inside a DO block.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pplcrm_owner') THEN
    CREATE ROLE pplcrm_owner LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pplcrm_app') THEN
    CREATE ROLE pplcrm_app LOGIN;
  END IF;
END $$;
ALTER ROLE pplcrm_owner PASSWORD :'owner_pw';
ALTER ROLE pplcrm_app PASSWORD :'app_pw';

-- 2. Ownership -----------------------------------------------------------------
-- The owner role owns the schema and every existing object. REASSIGN OWNED must
-- run as the current owner or a superuser.
ALTER SCHEMA public OWNER TO pplcrm_owner;
REASSIGN OWNED BY :current_owner TO pplcrm_owner;

-- 3. Lock down the public schema ----------------------------------------------
REVOKE CREATE ON SCHEMA public FROM PUBLIC;                 -- S-2a (default in PG15+)
GRANT USAGE ON SCHEMA public TO pplcrm_app;                 -- resolve objects, no CREATE

-- 4. Runtime role: CRUD only, no DDL, no ownership -----------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pplcrm_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pplcrm_app;  -- nextval on serial/identity

-- 5. Future objects the owner creates auto-grant to the app role ---------------
ALTER DEFAULT PRIVILEGES FOR ROLE pplcrm_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pplcrm_app;
ALTER DEFAULT PRIVILEGES FOR ROLE pplcrm_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO pplcrm_app;
