import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * D-2: Give `profiles` a real primary key and tighten the 1:1 with authusers
 * (schema review 2026-07-06, §3).
 *
 * `profiles` was the only table without a PK — it had `id bigint NOT NULL
 * DEFAULT nextval(...)` backed by a UNIQUE *constraint* `profiles_id_key`, but
 * no PK constraint (logical replication, REPLICA IDENTITY, and many tools
 * care). Verified: 0 rows with NULL auth_id and 0 duplicate auth_id, so the
 * NOT NULL + UNIQUE(auth_id) tightening is safe; and no FK references
 * profiles(id), so dropping the UNIQUE constraint to make room for the PK is
 * safe.
 *
 * The redundant `fk_profiles_auth_id` twin is removed separately in D-1; the
 * CASCADE `profiles_auth_id_fkey` remains.
 *
 * Guarded with DO blocks so the migration is a no-op on a fresh database whose
 * baseline schema.sql already carries the PK and unique constraint.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Replace the UNIQUE constraint on (id) with a real primary key. The unique
  // index is owned by the constraint, so it cannot be promoted via USING INDEX;
  // drop the constraint and add the PK (no FK depends on it).
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass AND contype = 'p'
      ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_key;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
      END IF;
    END $$;
  `.execute(db);

  // Tighten the 1:1 relationship with authusers.
  await sql`ALTER TABLE public.profiles ALTER COLUMN auth_id SET NOT NULL;`.execute(db);

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_auth_id_unique'
      ) THEN
        ALTER TABLE public.profiles
          ADD CONSTRAINT profiles_auth_id_unique UNIQUE (auth_id);
      END IF;
    END $$;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_auth_id_unique;`.execute(db);
  await sql`ALTER TABLE public.profiles ALTER COLUMN auth_id DROP NOT NULL;`.execute(db);
  // Demote the PK back to the original UNIQUE constraint on (id).
  await sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_pkey'
      ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_pkey;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_key UNIQUE (id);
      END IF;
    END $$;
  `.execute(db);
}
