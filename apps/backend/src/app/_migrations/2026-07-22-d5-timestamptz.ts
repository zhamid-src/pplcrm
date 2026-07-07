import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * D-5: Convert the remaining `timestamp without time zone` columns to
 * timestamptz (schema review 2026-07-06, §3).
 *
 * Nine tables — the email domain (emails.deleted_at, email_bodies,
 * email_headers incl. date_sent, email_recipients, email_attachments,
 * email_drafts, email_trash), donations, and files — stored tz-less timestamps
 * while ~50 other tables (and even emails.created_at in the same table) used
 * timestamptz. A tz-less value silently shifts the moment an app server, worker,
 * or DBA session runs in a different zone. This adopts "timestamptz always".
 *
 * The conversion interprets existing values as UTC. With no production users and
 * the dev data cleared before this ran, there is no historical data to
 * misinterpret, so the source-zone choice is immaterial here; the app should
 * write UTC going forward.
 *
 * up() is dynamic and idempotent: it converts only columns that are still
 * tz-less, so it is a no-op on a database whose baseline is already timestamptz.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND data_type = 'timestamp without time zone'
      LOOP
        EXECUTE format(
          'ALTER TABLE public.%I ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE ''UTC''',
          r.table_name, r.column_name, r.column_name);
      END LOOP;
    END $$;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Revert the specific columns this migration converted (a dynamic reverse
  // would wrongly demote columns that were always timestamptz).
  await sql`
    ALTER TABLE public.donations         ALTER COLUMN created_at TYPE timestamp, ALTER COLUMN updated_at TYPE timestamp;
    ALTER TABLE public.files             ALTER COLUMN created_at TYPE timestamp, ALTER COLUMN updated_at TYPE timestamp;
    ALTER TABLE public.emails            ALTER COLUMN deleted_at TYPE timestamp;
    ALTER TABLE public.email_bodies      ALTER COLUMN created_at TYPE timestamp, ALTER COLUMN updated_at TYPE timestamp;
    ALTER TABLE public.email_headers     ALTER COLUMN created_at TYPE timestamp, ALTER COLUMN updated_at TYPE timestamp, ALTER COLUMN date_sent TYPE timestamp;
    ALTER TABLE public.email_recipients  ALTER COLUMN created_at TYPE timestamp, ALTER COLUMN updated_at TYPE timestamp;
    ALTER TABLE public.email_attachments ALTER COLUMN created_at TYPE timestamp, ALTER COLUMN updated_at TYPE timestamp;
    ALTER TABLE public.email_drafts      ALTER COLUMN created_at TYPE timestamp, ALTER COLUMN updated_at TYPE timestamp;
    ALTER TABLE public.email_trash       ALTER COLUMN created_at TYPE timestamp, ALTER COLUMN updated_at TYPE timestamp, ALTER COLUMN trashed_at TYPE timestamp;
  `.execute(db);
}
