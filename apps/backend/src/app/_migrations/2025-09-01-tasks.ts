/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: tasks ========');

  await db.schema
    .createTable('tasks')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('details', 'text')
    .addColumn('due_at', 'timestamp')
    .addColumn('status', 'text', (col) => col.defaultTo('todo'))
    .addColumn('priority', 'text')
    .addColumn('assigned_to', 'bigint')
    .addColumn('completed_at', 'timestamp')
    .addColumn('position', 'integer', (col) => col.defaultTo(0))
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_tasks_tenant_id', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_tasks_createdby_id', ['createdby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_tasks_updatedby_id', ['updatedby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_tasks_assigned_to', ['assigned_to'], 'authusers', ['id'])
    .addPrimaryKeyConstraint('tasks_id_tenantid', ['id', 'tenant_id'])
    .execute();

  await db.schema.createIndex('tasks_tenant_index').on('tasks').column('tenant_id').execute();

  // No mapping table needed since tasks.assigned_to stores ownership
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: tasks =======');
  await db.schema.dropTable('tasks').cascade().execute();
}
