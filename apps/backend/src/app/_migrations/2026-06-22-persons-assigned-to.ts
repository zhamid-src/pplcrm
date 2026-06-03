import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: persons-assigned-to ========');

  await db.schema.alterTable('persons').addColumn('assigned_to', 'bigint').execute();

  await db.schema
    .alterTable('persons')
    .addForeignKeyConstraint('fk_persons_assigned_to', ['assigned_to'], 'authusers', ['id'], (cb) =>
      cb.onDelete('set null'),
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: persons-assigned-to ========');

  await db.schema.alterTable('persons').dropConstraint('fk_persons_assigned_to').execute();

  await db.schema.alterTable('persons').dropColumn('assigned_to').execute();
}
