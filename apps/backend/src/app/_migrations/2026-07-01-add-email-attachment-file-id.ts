import type { Kysely} from 'kysely';
import { sql } from 'kysely';

// email_attachments was missing the file_id link to the files table, even though
// the download/inline-image endpoints (and the send/ingest code) reference it.
// Without it, attachment metadata could never be resolved back to stored blobs,
// so downloads always 404'd. Add the column + FK (SET NULL on file delete, matching
// companies.file_id / profiles.avatar_file_id), and backfill existing rows by
// matching on tenant_id + filename + size where unambiguous.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE email_attachments ADD COLUMN IF NOT EXISTS file_id bigint`.execute(db);

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_email_attachments_file'
      ) THEN
        ALTER TABLE email_attachments
          ADD CONSTRAINT fk_email_attachments_file
          FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL;
      END IF;
    END$$;
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_email_attachments_file_id ON email_attachments USING btree (file_id)`.execute(
    db,
  );

  // Best-effort backfill: link existing attachments to a matching file when the
  // (tenant_id, filename, size) tuple resolves to exactly one file.
  await sql`
    UPDATE email_attachments ea
    SET file_id = f.id
    FROM files f
    WHERE ea.file_id IS NULL
      AND f.tenant_id = ea.tenant_id
      AND f.filename = ea.filename
      AND f.size_bytes = ea.size_bytes
      AND (
        SELECT count(*) FROM files f2
        WHERE f2.tenant_id = ea.tenant_id
          AND f2.filename = ea.filename
          AND f2.size_bytes = ea.size_bytes
      ) = 1
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE email_attachments DROP CONSTRAINT IF EXISTS fk_email_attachments_file`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_email_attachments_file_id`.execute(db);
  await sql`ALTER TABLE email_attachments DROP COLUMN IF EXISTS file_id`.execute(db);
}
