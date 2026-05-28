/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: billing columns on tenants ========');

  await db.schema
    .alterTable('tenants')
    .addColumn('stripe_customer_id', 'text')
    .addColumn('stripe_subscription_id', 'text')
    .addColumn('subscription_plan', 'text', (col) => col.defaultTo('free').notNull())
    .addColumn('subscription_status', 'text')
    .addColumn('subscription_ends_at', 'timestamp')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: billing columns on tenants =======');

  await db.schema
    .alterTable('tenants')
    .dropColumn('stripe_customer_id')
    .dropColumn('stripe_subscription_id')
    .dropColumn('subscription_plan')
    .dropColumn('subscription_status')
    .dropColumn('subscription_ends_at')
    .execute();
}
