/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: donations ========');

  await db.schema
    .createTable('donations')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('person_id', 'bigint', (col) => col.notNull())
    .addColumn('amount', 'integer', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
    .addColumn('stripe_session_id', 'text', (col) => col.unique())
    .addColumn('tax_credit_amount', 'integer')
    .addColumn('residency_province', 'text')
    .addColumn('residency_country', 'text')
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('fk_donations_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_donations_person', ['person_id'], 'persons', ['id'], (cb) => cb.onDelete('cascade'))
    .addForeignKeyConstraint('fk_donations_createdby', ['createdby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_donations_updatedby', ['updatedby_id'], 'authusers', ['id'])
    .addPrimaryKeyConstraint('donations_pk', ['id', 'tenant_id'])
    .execute();

  await db.schema.createIndex('idx_donations_tenant').on('donations').column('tenant_id').execute();
  await db.schema.createIndex('idx_donations_person').on('donations').columns(['tenant_id', 'person_id']).execute();
  await db.schema.createIndex('idx_donations_stripe_session').on('donations').column('stripe_session_id').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: donations ========');
  await db.schema.dropTable('donations').ifExists().cascade().execute();
}
