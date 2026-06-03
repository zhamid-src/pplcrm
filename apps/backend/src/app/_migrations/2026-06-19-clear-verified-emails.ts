import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: clear-verified-emails ========');

  await db.deleteFrom('settings').where('key', '=', 'communications.verified_emails').execute();
}

export async function down(_db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: clear-verified-emails ========');
  // Deleting verified emails is a destructive operation and cannot be automatically restored.
  // Down migration is a safe no-op.
}
