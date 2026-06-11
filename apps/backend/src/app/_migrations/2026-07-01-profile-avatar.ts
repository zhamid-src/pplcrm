/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: add avatar_file_id to profiles ========');
  await db.schema
    .alterTable('profiles')
    .addColumn('avatar_file_id', 'bigint', (col) =>
      col.references('files.id').onDelete('set null'),
    )
    .execute();

  await sql`CREATE INDEX IF NOT EXISTS idx_profiles_avatar_file_id ON profiles(avatar_file_id)`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: remove avatar_file_id from profiles ========');
  await db.schema.dropIndex('idx_profiles_avatar_file_id').ifExists().execute();
  await db.schema.alterTable('profiles').dropColumn('avatar_file_id').execute();
}
