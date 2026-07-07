import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * D-6: Remove the stray sequence default on sessions.user_id (schema review
 * 2026-07-06, §3).
 *
 * sessions.user_id is a foreign key to authusers but carried
 * DEFAULT nextval('sessions_user_id_seq') — almost certainly created with
 * `serial` by accident. If any code path ever inserted a session without an
 * explicit user_id, Postgres would mint a fresh number and either violate the
 * FK or (once IDs collide) attach the session to an arbitrary user. The
 * application always supplies user_id explicitly (sessions.repo.ts), so
 * dropping the default and the orphaned sequence has no behavioral impact.
 *
 * Idempotent: DROP DEFAULT / DROP SEQUENCE IF EXISTS are no-ops on a fresh
 * database whose baseline no longer contains the sequence.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE public.sessions ALTER COLUMN user_id DROP DEFAULT;`.execute(db);
  await sql`DROP SEQUENCE IF EXISTS public.sessions_user_id_seq;`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`CREATE SEQUENCE IF NOT EXISTS public.sessions_user_id_seq;`.execute(db);
  await sql`ALTER TABLE public.sessions ALTER COLUMN user_id SET DEFAULT nextval('public.sessions_user_id_seq');`.execute(
    db,
  );
  await sql`ALTER SEQUENCE public.sessions_user_id_seq OWNED BY public.sessions.user_id;`.execute(db);
}
