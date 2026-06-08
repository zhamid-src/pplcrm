import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add avatar_file_id to profiles table (FK to files, nullable)
  await db.schema
    .alterTable('profiles')
    .addColumn('avatar_file_id', 'uuid', (col) =>
      col.references('files.id').onDelete('set null'),
    )
    .execute();

  await sql`CREATE INDEX IF NOT EXISTS idx_profiles_avatar_file_id ON profiles(avatar_file_id)`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('profiles').dropColumn('avatar_file_id').execute();
}
