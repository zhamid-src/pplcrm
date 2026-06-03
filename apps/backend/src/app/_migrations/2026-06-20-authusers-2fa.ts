import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: authusers-2fa ========');

  await db.schema
    .alterTable('authusers')
    .addColumn('two_factor_enabled', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('two_factor_code', 'text')
    .addColumn('two_factor_expires_at', 'timestamp')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: authusers-2fa ========');

  await db.schema
    .alterTable('authusers')
    .dropColumn('two_factor_enabled')
    .dropColumn('two_factor_code')
    .dropColumn('two_factor_expires_at')
    .execute();
}
