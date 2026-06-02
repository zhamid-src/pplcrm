/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: potential-duplicates ========');

  await db.schema
    .createTable('potential_duplicates')
    .addColumn('id', 'bigserial')
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('group_key', 'text', (col) => col.notNull())
    .addColumn('person_id', 'bigint', (col) => col.notNull())
    .addColumn('reason', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('fk_potential_duplicates_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_potential_duplicates_person', ['person_id'], 'persons', ['id'], (cb) => cb.onDelete('cascade'))
    .addPrimaryKeyConstraint('potential_duplicates_pk', ['id'])
    .execute();

  await db.schema
    .createIndex('idx_potential_duplicates_tenant_id')
    .on('potential_duplicates')
    .column('tenant_id')
    .execute();

  await db.schema
    .createIndex('idx_potential_duplicates_person_id')
    .on('potential_duplicates')
    .column('person_id')
    .execute();

  await db.schema
    .createIndex('idx_potential_duplicates_group_key')
    .on('potential_duplicates')
    .column('group_key')
    .execute();

  await db.schema
    .createIndex('idx_potential_duplicates_unique_group_person')
    .on('potential_duplicates')
    .columns(['group_key', 'person_id'])
    .unique()
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: potential-duplicates ========');
  await db.schema.dropTable('potential_duplicates').ifExists().cascade().execute();
}
