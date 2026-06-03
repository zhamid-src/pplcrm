import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: deletion-scheduling ========');

  await db.schema
    .alterTable('authusers')
    .addColumn('deletion_scheduled_at', 'timestamp')
    .execute();

  await db.schema
    .alterTable('tenants')
    .addColumn('deletion_scheduled_at', 'timestamp')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: deletion-scheduling ========');

  await db.schema
    .alterTable('authusers')
    .dropColumn('deletion_scheduled_at')
    .execute();

  await db.schema
    .alterTable('tenants')
    .dropColumn('deletion_scheduled_at')
    .execute();
}
