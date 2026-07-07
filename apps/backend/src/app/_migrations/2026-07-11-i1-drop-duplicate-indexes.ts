import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * I-1: Drop 15 exactly-duplicate indexes (schema review 2026-07-06, §4).
 *
 * Each dropped index shares identical key columns with a surviving
 * constraint-backed (UNIQUE / PK) or better-named twin on the same table, so
 * every row write was maintaining both while the planner only ever needed one.
 * The survivor is kept in every case; query plans are unaffected.
 *
 * Idempotent: DROP INDEX IF EXISTS is a no-op once schema.sql is refreshed.
 * (Production would use DROP INDEX CONCURRENTLY, which cannot run inside the
 * migration transaction; at dev size a plain drop is instant.)
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    DROP INDEX IF EXISTS public.authusers_email_index;                     -- dup of authusers_email_key
    DROP INDEX IF EXISTS public.sessions_session_id_index;                 -- dup of sessions_pkey
    DROP INDEX IF EXISTS public.sessions_refresh_token_index;              -- dup of sessions_refresh_token_key
    DROP INDEX IF EXISTS public.passkeys_credential_id_idx;                -- dup of passkeys_credential_id_key
    DROP INDEX IF EXISTS public.google_oauth_tokens_tenant_idx;            -- dup of google_oauth_tokens_tenant_id_key
    DROP INDEX IF EXISTS public.ms_oauth_tokens_tenant_idx;                -- dup of ms_oauth_tokens_tenant_id_key
    DROP INDEX IF EXISTS public.idx_donations_stripe_session;              -- dup of donations_stripe_session_id_key
    DROP INDEX IF EXISTS public.idx_email_bodies_email_id;                 -- dup of unique_email_bodies_email_id
    DROP INDEX IF EXISTS public.idx_email_headers_email_id;                -- dup of unique_email_headers_email_id
    DROP INDEX IF EXISTS public.households_tag_map_tenant_person_tag_index; -- dup of map_households_tags_pk
    DROP INDEX IF EXISTS public.peoples_tag_map_tenant_person_tag_index;   -- dup of map_peoples_tags_pk
    DROP INDEX IF EXISTS public.idx_map_lists_households;                  -- dup of map_lists_households_pk
    DROP INDEX IF EXISTS public.idx_map_lists_persons;                     -- dup of map_lists_persons_pk
    DROP INDEX IF EXISTS public.idx_user_activity_user;                    -- dup of idx_user_activity_tenant_user
    DROP INDEX IF EXISTS public.idx_user_activity_entity_id;               -- dup of idx_user_activity_tenant_entity
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE INDEX IF NOT EXISTS authusers_email_index ON public.authusers (email);
    CREATE INDEX IF NOT EXISTS sessions_session_id_index ON public.sessions (session_id);
    CREATE INDEX IF NOT EXISTS sessions_refresh_token_index ON public.sessions (refresh_token);
    CREATE INDEX IF NOT EXISTS passkeys_credential_id_idx ON public.passkeys (credential_id);
    CREATE INDEX IF NOT EXISTS google_oauth_tokens_tenant_idx ON public.google_oauth_tokens (tenant_id);
    CREATE INDEX IF NOT EXISTS ms_oauth_tokens_tenant_idx ON public.ms_oauth_tokens (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_donations_stripe_session ON public.donations (stripe_session_id);
    CREATE INDEX IF NOT EXISTS idx_email_bodies_email_id ON public.email_bodies (email_id);
    CREATE INDEX IF NOT EXISTS idx_email_headers_email_id ON public.email_headers (email_id);
    CREATE INDEX IF NOT EXISTS households_tag_map_tenant_person_tag_index ON public.map_households_tags (tenant_id, household_id, tag_id);
    CREATE INDEX IF NOT EXISTS peoples_tag_map_tenant_person_tag_index ON public.map_peoples_tags (tenant_id, person_id, tag_id);
    CREATE INDEX IF NOT EXISTS idx_map_lists_households ON public.map_lists_households (tenant_id, list_id, household_id);
    CREATE INDEX IF NOT EXISTS idx_map_lists_persons ON public.map_lists_persons (tenant_id, list_id, person_id);
    CREATE INDEX IF NOT EXISTS idx_user_activity_user ON public.user_activity (tenant_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_user_activity_entity_id ON public.user_activity (tenant_id, entity, entity_id);
  `.execute(db);
}
