import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * D-8: NOT NULL / default tightening on columns where NULL is meaningless
 * (schema review 2026-07-06, §3). The safe subset only — see the exclusions.
 *
 * Applied:
 *   - sessions.status: nullable with default 'active' -> NOT NULL.
 *   - Boolean columns with a default that should never be NULL:
 *     lists.is_dynamic, tags.deletable, map_peoples_tags.deletable.
 *   - OAuth token timestamps with default now(): created_at / updated_at -> NOT NULL.
 *
 * Deliberately NOT applied:
 *   - web_forms published-slug CHECK: createForm() always generates a unique
 *     slug, so real published forms always have one; a DB CHECK adds no safety
 *     over that and only rejects the partial fixtures some tests insert directly.
 *     Left out to avoid constraining a shape the application never produces.
 *   - sessions.expires_at stays nullable: the auth code treats NULL as a
 *     non-expiring session (controller.ts guards `session.expires_at && …` and
 *     `expires_at ?? null`), so NOT NULL would break a supported state.
 *   - authusers.role / authusers.tenant_id stay nullable: encoding "pending
 *     invite" as a real state touches authorization logic and is left to a
 *     deliberate change on the session/auth track (review's own caveat).
 *
 * SET NOT NULL is a no-op when the column is already NOT NULL.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.sessions ALTER COLUMN status SET NOT NULL;
    ALTER TABLE public.lists ALTER COLUMN is_dynamic SET NOT NULL;
    ALTER TABLE public.tags ALTER COLUMN deletable SET NOT NULL;
    ALTER TABLE public.map_peoples_tags ALTER COLUMN deletable SET NOT NULL;
    ALTER TABLE public.ms_oauth_tokens ALTER COLUMN created_at SET NOT NULL;
    ALTER TABLE public.ms_oauth_tokens ALTER COLUMN updated_at SET NOT NULL;
    ALTER TABLE public.google_oauth_tokens ALTER COLUMN created_at SET NOT NULL;
    ALTER TABLE public.google_oauth_tokens ALTER COLUMN updated_at SET NOT NULL;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.sessions ALTER COLUMN status DROP NOT NULL;
    ALTER TABLE public.lists ALTER COLUMN is_dynamic DROP NOT NULL;
    ALTER TABLE public.tags ALTER COLUMN deletable DROP NOT NULL;
    ALTER TABLE public.map_peoples_tags ALTER COLUMN deletable DROP NOT NULL;
    ALTER TABLE public.ms_oauth_tokens ALTER COLUMN created_at DROP NOT NULL;
    ALTER TABLE public.ms_oauth_tokens ALTER COLUMN updated_at DROP NOT NULL;
    ALTER TABLE public.google_oauth_tokens ALTER COLUMN created_at DROP NOT NULL;
    ALTER TABLE public.google_oauth_tokens ALTER COLUMN updated_at DROP NOT NULL;
  `.execute(db);
}
