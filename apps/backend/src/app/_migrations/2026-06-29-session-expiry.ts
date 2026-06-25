import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('sessions').addColumn('expires_at', 'timestamptz').execute();
  await db.schema.alterTable('sessions').addColumn('last_used_at', 'timestamptz').execute();

  // Backfill existing sessions: treat them as "remember me" sessions
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.updateTable('sessions').set({ expires_at: thirtyDaysFromNow, last_used_at: new Date() }).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('sessions').dropColumn('expires_at').execute();
  await db.schema.alterTable('sessions').dropColumn('last_used_at').execute();
}
