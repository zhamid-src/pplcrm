/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: volunteer_events & volunteer_shifts ========');

  // 1. Create volunteer_events table
  await db.schema
    .createTable('volunteer_events')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('location_address', 'text')
    .addColumn('start_time', 'timestamp', (col) => col.notNull())
    .addColumn('end_time', 'timestamp', (col) => col.notNull())
    .addColumn('capacity', 'integer')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('fk_events_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_events_createdby', ['createdby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_events_updatedby', ['updatedby_id'], 'authusers', ['id'])
    .addPrimaryKeyConstraint('volunteer_events_pk', ['id', 'tenant_id'])
    .execute();

  await db.schema.createIndex('idx_volunteer_events_tenant').on('volunteer_events').column('tenant_id').execute();
  await db.schema.createIndex('idx_volunteer_events_dates').on('volunteer_events').columns(['tenant_id', 'start_time', 'end_time']).execute();

  // 2. Create volunteer_shifts table
  await db.schema
    .createTable('volunteer_shifts')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('event_id', 'bigint', (col) => col.notNull())
    .addColumn('person_id', 'bigint', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('signed_up')) // signed_up, attended, no_show, cancelled
    .addColumn('hours_worked', 'decimal(5, 2)')
    .addColumn('notes', 'text')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('fk_shifts_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_shifts_createdby', ['createdby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_shifts_updatedby', ['updatedby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_shifts_event', ['event_id'], 'volunteer_events', ['id'])
    .addForeignKeyConstraint('fk_shifts_person', ['person_id'], 'persons', ['id'])
    .addPrimaryKeyConstraint('volunteer_shifts_pk', ['id', 'tenant_id'])
    .execute();

  await db.schema.createIndex('idx_volunteer_shifts_tenant').on('volunteer_shifts').column('tenant_id').execute();
  await db.schema.createIndex('idx_volunteer_shifts_event').on('volunteer_shifts').columns(['tenant_id', 'event_id']).execute();
  await db.schema.createIndex('idx_volunteer_shifts_person').on('volunteer_shifts').columns(['tenant_id', 'person_id']).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: volunteer_events & volunteer_shifts ========');

  await db.schema.dropTable('volunteer_shifts').ifExists().cascade().execute();
  await db.schema.dropTable('volunteer_events').ifExists().cascade().execute();
}
