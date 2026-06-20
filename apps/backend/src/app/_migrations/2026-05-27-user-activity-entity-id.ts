/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: user_activity entity_id ========');

  await db.schema.alterTable('user_activity').addColumn('entity_id', 'text').execute();

  // Index so we can query "all activity for entity X" quickly
  await db.schema
    .createIndex('idx_user_activity_entity_id')
    .on('user_activity')
    .columns(['tenant_id', 'entity', 'entity_id'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: user_activity entity_id ========');
  await db.schema.dropIndex('idx_user_activity_entity_id').ifExists().execute();
  await db.schema.alterTable('user_activity').dropColumn('entity_id').execute();
}
