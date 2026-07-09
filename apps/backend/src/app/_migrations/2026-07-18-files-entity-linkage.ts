import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Storage settings §16 — files gain optional polymorphic linkage
 * (`entity_type`/`entity_id`) so a file can say what it belongs to (e.g. a
 * newsletter attachment, a team upload) instead of being an untethered blob.
 * This backs the Workspace settings → Storage tab's "largest files" list and
 * its "Attached to X" labels.
 *
 * `newsletters.attachments` (jsonb) is dropped: it was never read by the send
 * job and had no upload UI, so newsletter attachments move onto `files` via
 * entity linkage instead. Nothing is shipped yet, so dropping is safe.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql
    .raw(
      `
    ALTER TABLE public.files ADD COLUMN entity_type text;
    ALTER TABLE public.files ADD COLUMN entity_id bigint;
    CREATE INDEX files_entity_idx ON public.files (tenant_id, entity_type, entity_id);
    ALTER TABLE public.newsletters DROP COLUMN attachments;
  `,
    )
    .execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql
    .raw(
      `
    ALTER TABLE public.newsletters ADD COLUMN attachments jsonb;
    DROP INDEX IF EXISTS files_entity_idx;
    ALTER TABLE public.files DROP COLUMN IF EXISTS entity_id;
    ALTER TABLE public.files DROP COLUMN IF EXISTS entity_type;
  `,
    )
    .execute(db);
}
