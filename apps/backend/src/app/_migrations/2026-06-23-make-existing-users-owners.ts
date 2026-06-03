import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: make-existing-users-owners ========');
  await db.updateTable('authusers').set({ role: 'owner' }).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: make-existing-users-owners ========');
  await db.updateTable('authusers').set({ role: null }).execute();
}
