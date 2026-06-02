/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: drip-campaigns-event-and-hours ========');

  // 1. Add trigger_event_id to workflows table
  await db.schema
    .alterTable('workflows')
    .addColumn('trigger_event_id', 'bigint', (col) => col.references('volunteer_events.id').onDelete('set null'))
    .execute();

  // 2. Add delay_unit to workflow_steps table
  await db.schema
    .alterTable('workflow_steps')
    .addColumn('delay_unit', 'text', (col) => col.notNull().defaultTo('days'))
    .execute();

  // 3. Create index for performance
  await db.schema.createIndex('idx_workflows_trigger_event_id').on('workflows').column('trigger_event_id').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: drip-campaigns-event-and-hours ========');
  
  await db.schema.dropIndex('idx_workflows_trigger_event_id').ifExists().execute();
  
  await db.schema
    .alterTable('workflows')
    .dropColumn('trigger_event_id')
    .execute();

  await db.schema
    .alterTable('workflow_steps')
    .dropColumn('delay_unit')
    .execute();
}
