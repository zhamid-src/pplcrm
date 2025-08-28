/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('lists')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('object', 'text', (col) => col.notNull().check(sql`object IN ('people','households')`))
    .addColumn('is_dynamic', 'boolean', (col) => col.defaultTo(false))
    .addColumn('definition', 'jsonb')
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_lists_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_lists_createdby', ['createdby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_lists_updatedby', ['updatedby_id'], 'authusers', ['id'])
    .addPrimaryKeyConstraint('lists_id_tenantid', ['id', 'tenant_id'])
    .execute();

  await db.schema
    .createTable('map_lists_persons')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('list_id', 'bigint', (col) => col.notNull())
    .addColumn('person_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_map_lists_persons_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_map_lists_persons_list', ['list_id'], 'lists', ['id'])
    .addForeignKeyConstraint('fk_map_lists_persons_person', ['person_id'], 'persons', ['id'])
    .addPrimaryKeyConstraint('map_lists_persons_id_tenantid', ['id', 'tenant_id'])
    .addUniqueConstraint('unique_list_person_per_tenant', ['tenant_id', 'list_id', 'person_id'])
    .execute();

  await db.schema
    .createIndex('idx_map_lists_persons')
    .on('map_lists_persons')
    .columns(['tenant_id', 'list_id', 'person_id'])
    .execute();

  await db.schema
    .createTable('map_lists_households')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('list_id', 'bigint', (col) => col.notNull())
    .addColumn('household_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_map_lists_households_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_map_lists_households_list', ['list_id'], 'lists', ['id'])
    .addForeignKeyConstraint('fk_map_lists_households_household', ['household_id'], 'households', ['id'])
    .addPrimaryKeyConstraint('map_lists_households_id_tenantid', ['id', 'tenant_id'])
    .addUniqueConstraint('unique_list_household_per_tenant', ['tenant_id', 'list_id', 'household_id'])
    .execute();

  await db.schema
    .createIndex('idx_map_lists_households')
    .on('map_lists_households')
    .columns(['tenant_id', 'list_id', 'household_id'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('map_lists_households').cascade().execute();
  await db.schema.dropTable('map_lists_persons').cascade().execute();
  await db.schema.dropTable('lists').cascade().execute();
}
