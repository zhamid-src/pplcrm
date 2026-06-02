/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: drip-campaigns ========');

  // 1. Create workflows table
  await db.schema
    .createTable('workflows')
    .addColumn('id', 'bigserial')
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('trigger_type', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('draft'))
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('fk_workflows_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_workflows_createdby', ['createdby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_workflows_updatedby', ['updatedby_id'], 'authusers', ['id'])
    .addPrimaryKeyConstraint('workflows_pk', ['id'])
    .execute();

  // 2. Create workflow_steps table
  await db.schema
    .createTable('workflow_steps')
    .addColumn('id', 'bigserial')
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('workflow_id', 'bigint', (col) => col.notNull())
    .addColumn('step_number', 'integer', (col) => col.notNull())
    .addColumn('delay_days', 'integer', (col) => col.notNull())
    .addColumn('subject', 'text', (col) => col.notNull())
    .addColumn('preview_text', 'text')
    .addColumn('html_content', 'text')
    .addColumn('plain_text_content', 'text')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('fk_workflow_steps_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_workflow_steps_workflow', ['workflow_id'], 'workflows', ['id'], (cb) => cb.onDelete('cascade'))
    .addPrimaryKeyConstraint('workflow_steps_pk', ['id'])
    .execute();

  // 3. Create workflow_enrollments table
  await db.schema
    .createTable('workflow_enrollments')
    .addColumn('id', 'bigserial')
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('workflow_id', 'bigint', (col) => col.notNull())
    .addColumn('person_id', 'bigint', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('active'))
    .addColumn('current_step_number', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('next_run_at', 'timestamp')
    .addColumn('enrolled_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('fk_workflow_enrollments_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_workflow_enrollments_workflow', ['workflow_id'], 'workflows', ['id'], (cb) => cb.onDelete('cascade'))
    .addForeignKeyConstraint('fk_workflow_enrollments_person', ['person_id'], 'persons', ['id'], (cb) => cb.onDelete('cascade'))
    .addPrimaryKeyConstraint('workflow_enrollments_pk', ['id'])
    .execute();

  // Indexes
  await db.schema.createIndex('idx_workflows_tenant_id').on('workflows').column('tenant_id').execute();
  await db.schema.createIndex('idx_workflow_steps_workflow_id').on('workflow_steps').column('workflow_id').execute();
  await db.schema.createIndex('idx_workflow_enrollments_tenant_id').on('workflow_enrollments').column('tenant_id').execute();
  await db.schema.createIndex('idx_workflow_enrollments_workflow_person').on('workflow_enrollments').columns(['workflow_id', 'person_id']).execute();
  await db.schema.createIndex('idx_workflow_enrollments_next_run').on('workflow_enrollments').columns(['status', 'next_run_at']).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: drip-campaigns ========');
  await db.schema.dropTable('workflow_enrollments').ifExists().cascade().execute();
  await db.schema.dropTable('workflow_steps').ifExists().cascade().execute();
  await db.schema.dropTable('workflows').ifExists().cascade().execute();
}
